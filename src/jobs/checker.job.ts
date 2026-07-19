import { TIMEZONE } from '@/config'
import env from '@/env'
import { getOrCreateAmulApi } from '@/libs/amulApi.lib'
import {
  AmulAutoOrder,
  getAmulAutoOrderErrorMessage,
  isAmulSessionAuthenticationError
} from '@/libs/autoOrder.lib'
import ProductModel, { HydratedProduct } from '@/models/product.model'
import ProductStockHistoryModel from '@/models/productStockHistory.model'
import UserModel, { IUser } from '@/models/user.model'
import { sendMessageQueue } from '@/queues/broadcast.queue'
import { getAmulApiFromSubstore } from '@/services/amul.service'
import { runAutoOrderRequest } from '@/services/autoOrderExecution.service'
import cacheService from '@/services/cache.service'
import { hasValidAutoBookingPayment } from '@/services/payment.service'
import { findAndUpdateProductsWithAlwaysTracking } from '@/services/track.service'
import { getDistinctSubstores } from '@/services/user.service'
import { sleep } from '@/utils'
import {
  getInventoryQuantity,
  getProductUrl,
  isAvailableToPurchase
} from '@/utils/amul.util'
import { isAutoOrderConfigured, isLoggedIn } from '@/utils/autoOrder.util'
import { emojis } from '@/utils/emoji.util'
import { formatProductDetails } from '@/utils/format.util'
import { logToChannel } from '@/utils/logger.util'
import { startCommandLink } from '@/utils/telegram.util'
import { Types } from 'mongoose'
import { schedule } from 'node-cron'
import { inlineKeyboard } from 'telegraf/markup'

interface ProductWithUser extends Omit<HydratedProduct, 'trackedBy'> {
  trackedBy: IUser & { _id: Types.ObjectId }
}

const MAX_SESSION_OLD_DAYS = 5 // Maximum age of session in days

const stockCheckerJob = schedule(
  '* * * * *', // Every 1 minutes
  async () => {
    try {
      if (!env.TRACKER_ENABLED) {
        console.log('Stock tracker is disabled. Skipping job execution.')
        return
      }

      const distinctSubstores = await getDistinctSubstores()

      for (const substore of distinctSubstores) {
        try {
          let amulApi = await getAmulApiFromSubstore(substore)

          const currentTime = new Date()
          const sessionAgeInDays =
            (currentTime.getTime() -
              (amulApi?.instanceInitializedAt.getTime() || 0)) /
            (1000 * 60 * 60 * 24) // Convert milliseconds to days

          if (amulApi && sessionAgeInDays > MAX_SESSION_OLD_DAYS) {
            console.log(
              `Session for substore ${substore} is older than ${MAX_SESSION_OLD_DAYS} days. Reinitializing...`
            )
            // Close the old session
            amulApi.close()
            // Remove the old session from the map
            amulApi = undefined
            // Inform
            logToChannel(
              `${emojis.warning} Session for substore ${substore} is older than ${MAX_SESSION_OLD_DAYS} days. Reinitializing...`
            )
          }

          if (!amulApi) {
            // find any user with this substore and initialize
            const user = await UserModel.findOne({
              substore: substore,
              pincode: { $exists: true }
            })

            if (!user) {
              console.warn(
                `No user found for substore ${substore}. Skipping stock check.`
              )
              continue
            }

            amulApi = await getOrCreateAmulApi(user.pincode, substore)
            // Inform
            logToChannel(
              `${emojis.info} Initialized Amul API for substore ${substore} with pincode ${user.pincode}.`
            )
          }

          const freshProducts = await amulApi.getAmulProducts({
            bypassCache: true
          })

          if (!freshProducts || !freshProducts.length) {
            console.warn(
              `No fresh products found for substore ${substore}. Skipping stock check.`
            )
            logToChannel(
              `${emojis.warning} No fresh products found for substore ${substore}. Skipping stock check.`
            )
            continue
          }

          // console.log(`Fetched fresh products:`, freshProducts.length)
          const cachedProducts = await cacheService.jobData.get({
            substore
          })
          // console.log(`Fetched cached products:`, cachedProducts?.length)
          if (!cachedProducts?.length) {
            console.log(`Setting fresh products:`, freshProducts.length)
            const resp = await cacheService.jobData.set(
              { substore },
              freshProducts
            )
            console.log(`Cache set response:`, resp)
            continue
          }
          console.log(`cachedProducts`, cachedProducts.length)

          // map through fresh products and check if any have changed
          const promises: Promise<any>[] = []

          const changedProducts = freshProducts.filter((freshProduct) => {
            const cachedProduct = cachedProducts.find(
              (p) => p.sku === freshProduct.sku
            )
            if (!cachedProduct) return false

            const wasUnavailableForPurchase =
              !isAvailableToPurchase(cachedProduct)

            const wasAvailableForPurchase = isAvailableToPurchase(cachedProduct)

            const isAvailablForPurchase = isAvailableToPurchase(freshProduct)
            if (isAvailablForPurchase) {
              ProductStockHistoryModel.updateOne(
                {
                  sku: freshProduct.sku,
                  substore: substore
                },
                {
                  $setOnInsert: {
                    sku: freshProduct.sku,
                    substore: substore
                  },
                  $currentDate: {
                    lastSeenInStockAt: true
                  }
                },
                {
                  upsert: true
                }
              )
                .then(() => {
                  // do nothing
                })
                .catch((err) => {
                  console.error(
                    `Failed to update stock history for product ${freshProduct.sku}: ${err.message}`
                  )
                  logToChannel(
                    `${emojis.crossMark} Failed to update stock history for product ${freshProduct.sku}: ${err.message}`
                  )
                })
            }

            if (wasUnavailableForPurchase && isAvailablForPurchase) {
              // If the product was previously unavailable and is now available, we consider it changed
              // Now those users who were always tracking this product will be notified
              promises.push(
                findAndUpdateProductsWithAlwaysTracking(freshProduct.sku)
              )

              // if the product is now available, we can set the firstSeenInStockAt field if it doesn't exist
              ProductStockHistoryModel.updateOne(
                {
                  sku: freshProduct.sku,
                  substore: substore
                },
                {
                  $setOnInsert: {
                    firstSeenInStockAt: new Date()
                  }
                },
                {
                  upsert: true
                }
              )
                .then(() => {
                  // do nothing
                })
                .catch((err) => {
                  console.error(
                    `Failed to update stock history for product ${freshProduct.sku}: ${err.message}`
                  )
                  logToChannel(
                    `${emojis.crossMark} Failed to update stock history for product ${freshProduct.sku}: ${err.message}`
                  )
                })
            }

            if (wasAvailableForPurchase && !isAvailablForPurchase) {
              // If the product was previously available and is now unavailable, we consider it changed
              // store the last seen in stock time for this product in the ProductStockHistoryModel
              ProductStockHistoryModel.updateOne(
                {
                  sku: freshProduct.sku,
                  substore: substore
                },
                {
                  $currentDate: {
                    lastSeenInStockAt: true
                  }
                },
                {
                  upsert: true
                }
              )
                .then(() => {
                  // do nothing
                })
                .catch((err) => {
                  console.error(
                    `Failed to update stock history for product ${freshProduct.sku}: ${err.message}`
                  )
                  logToChannel(
                    `${emojis.crossMark} Failed to update stock history for product ${freshProduct.sku}: ${err.message}`
                  )
                })
            }

            return (
              freshProduct.available !== cachedProduct.available ||
              freshProduct.inventory_quantity !==
                cachedProduct.inventory_quantity
            )
          })

          await cacheService.jobData.set({ substore }, freshProducts) // Update cache with fresh products

          if (!changedProducts.length) {
            console.log(`[${substore}] No stock changes detected.`)

            continue
          }

          await Promise.allSettled(promises) // Wait for all findAndUpdateProductsWithAlwaysTracking promises to resolve

          // Notify users about the stock changes
          const usersToNotify = await ProductModel.aggregate<ProductWithUser>([
            {
              $match: {
                $or: [
                  { remainingNotifyCount: { $gt: 0 } },
                  // New migration will not have this field so pick them all for once notification
                  {
                    remainingNotifyCount: { $exists: false }
                  }
                ]
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'trackedBy',
                foreignField: '_id',
                as: 'user'
              }
            },
            {
              $unwind: {
                path: '$user'
              }
            },
            {
              $match: {
                'user.substore': substore
              }
            },
            {
              $addFields: {
                trackedBy: '$user'
              }
            },
            {
              $project: {
                user: 0 // Remove the temporary joined field
              }
            }
          ])

          let notifiedCount = 0

          for (const dbProduct of usersToNotify) {
            const product = changedProducts.find((p) => p.sku === dbProduct.sku)
            if (!product) continue

            const user = dbProduct.trackedBy
            if (!user) continue

            const isAvailablForPurchase = isAvailableToPurchase(product)
            if (!isAvailablForPurchase) {
              console.log(
                `Product ${product.name} (${product.sku}) is not available for purchase. Skipping notification.`
              )
              continue
            }

            notifiedCount++

            const trackingStyle = user.settings?.trackingStyle || 'once'
            const trackingCount = user.settings?.maxNotifyCount || 1

            const keyboard = inlineKeyboard([
              [
                {
                  text:
                    trackingStyle === 'once'
                      ? 'Track Again'
                      : `${emojis.stopSign} Untrack`,
                  url: await startCommandLink(
                    `${trackingStyle === 'once' ? 'track' : 'untrack'}_${
                      product.sku
                    }`
                  )
                },
                {
                  text: 'Goto Amul',
                  url: getProductUrl(product)
                }
              ]
            ])

            const getInfoMessage = async () => {
              const AUTO_BUY_BANNER = [
                '',
                `${emojis.star} want to auto-order this product whenever it's in stock?`,
                `Send /autoorder to set it up now!`
              ].join('\n')

              if (trackingStyle === 'once') {
                return `<i>The product is now untracked. You can track it again using the button below. ${!(await hasValidAutoBookingPayment(user._id)) ? AUTO_BUY_BANNER : ''}</i>`
              } else if (
                trackingStyle === 'always' &&
                (dbProduct.remainingNotifyCount ?? 1) - 1 < 1
              ) {
                return `<i>You will receive more updates when the product will be restocked. ${!(await hasValidAutoBookingPayment(user._id)) ? AUTO_BUY_BANNER : ''}</i>`
              } else {
                return `<i>You will receive updates ${
                  dbProduct.remainingNotifyCount - 1
                } more times for this product. Once done, You'll receive ${trackingCount} update(s) on next restock. ${!(await hasValidAutoBookingPayment(user._id)) ? AUTO_BUY_BANNER : ''}</i>`
              }
            }

            const message = [
              `${emojis.fire} <b>Product Update: ${product.name}</b>`,
              formatProductDetails(product, isAvailablForPurchase, 0, {
                pincode: user.pincode,
                substore: user.substore
              }),
              '',
              await getInfoMessage()
              // Show untracked info
            ].join('\n')

            if (!user.tgId) {
              console.warn(
                `User ${user._id} does not have a Telegram ID. Skipping notification.`
              )
              continue
            }

            await sendMessageQueue({
              chatId: user.tgId!,
              text: message,
              extra: {
                disable_notification: false, // Enable notifications
                reply_markup: keyboard.reply_markup
              },
              onComplete: async (err) => {
                if (err) {
                  console.error(
                    `Failed to send message to user ${user._id}: ${err.message}`
                  )
                  logToChannel(
                    `${emojis.crossMark} [err:onComplete] Failed to send message to user ${user._id}: ${err.message}`
                  )
                } else {
                  console.log(
                    `Notification sent to user ${user._id} for product ${product.sku}`
                  )

                  if (trackingStyle === 'always') {
                    await ProductModel.findOneAndUpdate(
                      {
                        sku: product.sku,
                        trackedBy: user._id
                      },
                      {
                        $inc: {
                          remainingNotifyCount: -1 // Decrease the remaining notify count
                        }
                      },
                      {
                        new: true
                      }
                    )
                  } else if (trackingStyle === 'once') {
                    await ProductModel.findOneAndDelete({
                      sku: product.sku,
                      trackedBy: user._id
                    })
                  }

                  // Auto Order Check
                  if (
                    isAutoOrderConfigured() &&
                    user.orderSettings.permitted &&
                    user.orderSettings.enabled &&
                    user.orderSettings.skus.includes(product.sku) &&
                    isLoggedIn(user)
                  ) {
                    try {
                      await sendMessageQueue({
                        chatId: user.tgId!,
                        text: `${emojis.star} Your auto-order is being placed for ${product.name}. Please wait...`
                      })

                      const amulApi = await getAmulApiFromSubstore(
                        user.substore!
                      )

                      if (!amulApi) {
                        console.error(
                          `Failed to initialize Amul API for user ${user._id} during auto-order.`
                        )
                        logToChannel(
                          `${emojis.crossMark} Failed to initialize Amul API for user ${user._id} during auto-order.`
                        )
                        await sendMessageQueue({
                          chatId: user.tgId!,
                          text: `[E451] ${emojis.crossMark} Failed to initialize Amul API for auto-order. Please try again later.`
                        })
                        return
                      }
                      const amulOrderApi = new AmulAutoOrder(
                        amulApi,
                        user.cookies
                      )

                      if (!user.address?.amulId) {
                        console.error(
                          `User ${user._id} does not have an address set for auto-order.`
                        )
                        logToChannel(
                          `${emojis.crossMark} User ${user._id} does not have an address set for auto-order.`
                        )
                        await sendMessageQueue({
                          chatId: user.tgId!,
                          text: `[E452] ${emojis.crossMark} No address found for auto-order. Please set your address using /autoorder command.`
                        })
                        return
                      }

                      const addressId = user.address.amulId
                      let response
                      try {
                        response = await runAutoOrderRequest(
                          user._id.toString(),
                          () =>
                            amulOrderApi.placeOrder({
                              addressId,
                              cartId: user.amulCartId!,
                              sku: product.sku
                            })
                        )
                      } catch (err) {
                        const errorMessage = getAmulAutoOrderErrorMessage(err)

                        if (isAmulSessionAuthenticationError(err)) {
                          await UserModel.findByIdAndUpdate(user._id, {
                            $set: {
                              cookies: [],
                              amulUserId: null,
                              amulCartId: null,
                              'orderSettings.enabled': false
                            }
                          })
                          console.warn(
                            `Amul session expired for user ${user._id}`
                          )
                          logToChannel(
                            `[E453] ${emojis.warning} Amul session expired for user ${user._id}; auto-ordering was disabled.`
                          )
                          await sendMessageQueue({
                            chatId: user.tgId!,
                            text: `[E453] ${emojis.warning} Your Amul session has expired, so auto-ordering was disabled. Please log in again using /autoorder.`
                          })
                          return
                        }

                        console.error(
                          `Failed to place order for user ${user._id}: ${errorMessage}`
                        )
                        logToChannel(
                          `[E453] ${emojis.crossMark} Failed to place order for user ${user._id}: ${errorMessage}`
                        )
                        await sendMessageQueue({
                          chatId: user.tgId!,
                          text: `[E453] ${emojis.crossMark} Auto-order checkout failed for ${product.name} before the bot received a payment link. The technical error has been logged. Please try again later.`
                        })
                        return
                      }

                      if (!response) {
                        console.error(
                          `[E454] ${emojis.crossMark} No response received when placing order for user ${user._id}.`
                        )
                        logToChannel(
                          `[E454] ${emojis.crossMark} No response received when placing order for user ${user._id}.`
                        )

                        await sendMessageQueue({
                          chatId: user.tgId!,
                          text: `[E454] ${emojis.crossMark} Failed to place auto-order. Please try again later.`
                        })
                        return
                      }

                      await UserModel.findByIdAndUpdate(user._id, {
                        $set: {
                          cookies: response.cookieExpiry,
                          amulCartId: response.cartId
                        }
                      })

                      const paymentUrl = response.paymentUrl

                      if (!paymentUrl) {
                        console.error(
                          `${emojis.crossMark} [E455] Payment URL not found in response for user ${user._id}.`
                        )
                        logToChannel(
                          `${emojis.crossMark} [E455] Payment URL not found in response for user ${user._id}.`
                        )
                        await sendMessageQueue({
                          chatId: user.tgId!,
                          text: `[E455] ${emojis.crossMark} Failed to retrieve payment URL. Please try again later.`
                        })
                        return
                      }

                      await sendMessageQueue({
                        chatId: user.tgId!,
                        text: [
                          `${emojis.checkMark} Auto-order has been initiated for ${product.name}.`,
                          `Please click on the button below to goto payment page and complete the order.`,
                          ``,
                          // give info to user that payment link is only valid for 15 minutes
                          `<i>Note: The payment link is only valid for 15 minutes. Please complete the payment within that time to successfully place the order.</i>`
                        ].join('\n'),
                        extra: {
                          reply_markup: inlineKeyboard([
                            [
                              {
                                text: 'Go to Payment',
                                url: paymentUrl
                              }
                            ]
                          ]).reply_markup
                        }
                      })
                    } catch (err) {
                      console.error(
                        `Failed to place auto-order for user ${user._id}: ${
                          err instanceof Error ? err.message : String(err)
                        }`
                      )
                      logToChannel(
                        `[E466] ${emojis.crossMark} Failed to place auto-order for user ${user._id}: ${
                          err instanceof Error ? err.message : String(err)
                        }`
                      )
                      await sendMessageQueue({
                        chatId: user.tgId!,
                        text: `[E466] ${emojis.crossMark} Failed to place auto-order. Please try again later.`
                      })
                      return
                    }
                  }
                }
              }
            }).catch((err) => {
              console.error(
                `[checker.job]Failed to send message to user ${user._id}: ${err.message}`
              )
              logToChannel(
                `${emojis.crossMark} [checker.job] Failed to send message to user ${user._id}: ${err.message}`
              )
            })
          }

          if (notifiedCount > 0) {
            logToChannel(
              `${emojis.refresh} Stock update (${substore}): ${changedProducts
                .map((p) => `${p.name} (${getInventoryQuantity(p)})`)
                .join(', ')}\nNotified ${notifiedCount} users.`
            )
          }

          await sleep(500) // Sleep for 500ms to avoid rate limiting
        } catch (err: any) {
          console.error(`Error processing substore ${substore}: ${err.message}`)
          logToChannel(
            `${emojis.crossMark} Error processing substore ${substore}: ${
              err instanceof Error ? err.message : String(err)
            }`
          )
        }
      }
    } catch (err) {
      console.error('Error in check-stock-job:', err)
      logToChannel(
        `${emojis.crossMark} Error in check-stock-job: ${
          err instanceof Error ? err.message : String(err)
        }`
      )
    }
  },
  {
    timezone: TIMEZONE,
    name: 'check-stock-job'
  }
)

export { stockCheckerJob }
