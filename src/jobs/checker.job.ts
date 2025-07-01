import { TIMEZONE } from '@/config'
import env from '@/env'
import { getOrCreateAmulApi } from '@/libs/amulApi.lib'
import ProductModel, { HydratedProduct } from '@/models/product.model'
import ProductStockHistoryModel from '@/models/productStockHistory.model'
import UserModel, { IUser } from '@/models/user.model'
import { sendMessageQueue } from '@/queues/broadcast.queue'
import { getAmulApiFromSubstore } from '@/services/amul.service'
import cacheService from '@/services/cache.service'
import { getDistinctSubstores } from '@/services/user.service'
import { sleep } from '@/utils'
import { isAvailableToPurchase } from '@/utils/amul.util'
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
  '*/5 * * * *', // Every 5 minutes
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

            amulApi = await getOrCreateAmulApi(user.pincode)
          }

          const freshProducts = await amulApi.getProteinProducts({
            bypassCache: true
          })
          console.log(`Fetched fresh products:`, freshProducts.length)
          const cachedProducts = await cacheService.jobData.get({
            substore
          })
          console.log(`Fetched cached products:`, cachedProducts?.length)
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
          const changedProducts = freshProducts.filter((freshProduct) => {
            const cachedProduct = cachedProducts.find(
              (p) => p.sku === freshProduct.sku
            )
            if (!cachedProduct) return false

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
                .then((result) => {
                  console.log(
                    `Stock history updated for product ${freshProduct.sku}`,
                    JSON.stringify(result)
                  )
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
            console.log('No stock changes detected.')

            continue
          }

          // Notify users about the stock changes
          const usersToNotify = await ProductModel.aggregate<ProductWithUser>([
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

            const keyboard = inlineKeyboard([
              [
                {
                  text: 'Track Again',
                  url: await startCommandLink(`track_${product.sku}`)
                }
              ]
            ])

            const message = [
              `${emojis.fire} <b>Product Update: ${product.name}</b>`,
              formatProductDetails(product, isAvailablForPurchase, 0),
              '',
              // Show untracked info
              `<i>The product is now untracked. You can track it again using the button below.</i>`
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
                reply_markup: keyboard.reply_markup
              },
              onComplete: async (err) => {
                if (err) {
                  console.error(
                    `Failed to send message to user ${user._id}: ${err.message}`
                  )
                  logToChannel(
                    `${emojis.crossMark} Failed to send message to user ${user._id}: ${err.message}`
                  )
                } else {
                  console.log(
                    `Notification sent to user ${user._id} for product ${product.sku}`
                  )
                  await ProductModel.findOneAndDelete({
                    sku: product.sku,
                    trackedBy: user._id
                  })
                }
              }
            }).catch((err) => {
              console.error(
                `Failed to send message to user ${user._id}: ${err.message}`
              )
              logToChannel(
                `${emojis.crossMark} Failed to send message to user ${user._id}: ${err.message}`
              )
            })
          }

          if (notifiedCount > 0) {
            logToChannel(
              `${emojis.refresh} Stock update (${substore}): ${changedProducts
                .map((p) => `${p.name} (${p.sku})`)
                .join(', ')}`
            )
            logToChannel(
              `<u>Notified ${notifiedCount} user(s) about stock changes in ${substore}.<u>`
            )
          }

          await sleep(2000) // Sleep for 2 seconds to avoid rate limiting
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
