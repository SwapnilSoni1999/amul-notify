import bot from '@/bot'
import env from '@/env'
import { substoreSessions } from '@/libs/amulApi.lib'
import ProductModel, { HydratedProduct } from '@/models/product.model'
import { IUser } from '@/models/user.model'
import cacheService from '@/services/cache.service'
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

const stockCheckerJob = schedule(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    try {
      if (!env.TRACKER_ENABLED) {
        console.log('Stock tracker is disabled. Skipping job execution.')
        return
      }

      const traversedSubstores = new Set<string>()

      for await (const [key, amulApi] of substoreSessions.entries()) {
        try {
          if (traversedSubstores.has(key.substore)) {
            console.log(`Skipping already traversed substore: ${key.substore}`)
            continue
          }
          traversedSubstores.add(key.substore)

          const freshProducts = await amulApi.getProteinProducts({
            bypassCache: true
          })
          console.log(`Fetched fresh products:`, freshProducts.length)
          const cachedProducts = await cacheService.jobData.get({
            substore: key.substore
          })
          console.log(`Fetched cached products:`, cachedProducts?.length)
          if (!cachedProducts?.length) {
            console.log(`Setting fresh products:`, freshProducts.length)
            const resp = await cacheService.jobData.set(
              { substore: key.substore },
              freshProducts
            )
            console.log(`Cache set response:`, resp)
            return
          }
          console.log(`cachedProducts`, cachedProducts.length)

          // map through fresh products and check if any have changed
          const changedProducts = freshProducts.filter((freshProduct) => {
            const cachedProduct = cachedProducts.find(
              (p) => p.sku === freshProduct.sku
            )
            if (!cachedProduct) return false
            return (
              freshProduct.available !== cachedProduct.available ||
              freshProduct.inventory_quantity !==
                cachedProduct.inventory_quantity ||
              freshProduct.inventory_quantity !==
                cachedProduct.inventory_quantity
            )
          })

          await cacheService.jobData.set(
            { substore: key.substore },
            freshProducts
          ) // Update cache with fresh products

          if (!changedProducts.length) {
            console.log('No stock changes detected.')

            return
          }

          // Log the changed products

          logToChannel(
            `🔄 Stock update (${key.pincode}-${key.substore}): ${changedProducts
              .map((p) => `${p.name} (${p.sku})`)
              .join(', ')}`
          )

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
              $unwind: '$user'
            },
            {
              $match: {
                'user.substore': key.substore
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

            bot.telegram
              .sendMessage(user.tgId!, message, {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup,
                link_preview_options: {
                  is_disabled: true
                }
              })
              .catch((err) => {
                console.error(
                  `Failed to send message to user ${user._id}: ${err.message}`
                )
                logToChannel(
                  `❌ Failed to send message to user ${user._id}: ${err.message}`
                )
              })
              .finally(async () => {
                // remove the tracked product from database
                await ProductModel.findOneAndDelete({
                  sku: product.sku,
                  trackedBy: user._id
                })
              })
          }
        } catch (err) {
          console.error(
            `Error processing substore ${key.substore}: ${err.message}`
          )
          logToChannel(
            `❌ Error processing substore ${key.substore}: ${
              err instanceof Error ? err.message : String(err)
            }`
          )
        }
      }
    } catch (err) {
      console.error('Error in check-stock-job:', err)
      logToChannel(
        `❌ Error in check-stock-job: ${
          err instanceof Error ? err.message : String(err)
        }`
      )
    }
  },
  {
    timezone: 'Asia/Kolkata',
    name: 'check-stock-job'
  }
)

export { stockCheckerJob }
