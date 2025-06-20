import bot from '@/bot'
import ProductModel from '@/models/product.model'
import { HydratedUser } from '@/models/user.model'
import amulService from '@/services/amul.service'
import cacheService from '@/services/cache.service'
import { isAvailableToPurchase } from '@/utils/amul.util'
import { emojis } from '@/utils/emoji.util'
import { formatProductDetails } from '@/utils/format.util'
import { logToChannel } from '@/utils/logger.util'
import { schedule } from 'node-cron'

schedule(
  '* * * * *',
  async () => {
    try {
      const freshProducts = await amulService.getProteinProducts({
        bypassCache: true
      })
      const cachedProducts = await cacheService.jobData.get()
      if (!cachedProducts) {
        await cacheService.jobData.set(freshProducts)
        return
      }

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
          freshProduct.inventory_quantity !== cachedProduct.inventory_quantity
        )
      })

      await cacheService.jobData.set(freshProducts) // Update cache with fresh products

      if (!changedProducts.length) {
        console.log('No stock changes detected.')

        return
      }

      // Log the changed products

      logToChannel(
        `🔄 Stock update: ${changedProducts
          .map((p) => `${p.name} (${p.sku})`)
          .join(', ')}`
      )

      // Notify users about the stock changes
      const usersToNotify = await ProductModel.find({
        sku: { $in: changedProducts.map((p) => p.sku) }
      }).populate<{ trackedBy: HydratedUser }>('trackedBy')

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

        const message = [
          `${emojis.fire} <b>Product Update: ${product.name}</b>`,
          formatProductDetails(product, isAvailablForPurchase, 0)
        ].join('\n')

        if (!user.tgId) {
          console.warn(
            `User ${user._id} does not have a Telegram ID. Skipping notification.`
          )
          continue
        }

        bot.telegram.sendMessage(user.tgId!, message, {
          parse_mode: 'HTML',
          link_preview_options: {
            is_disabled: true
          }
        })
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
