import amulService from '@/services/amul.service'
import { CommandContext } from '@/types/context.types'
import { isAvailableToPurchase } from '@/utils/amul.util'
import { formatProductDetails } from '@/utils/format.util'
import { logToChannel } from '@/utils/logger.util'
import { startCommandLink } from '@/utils/telegram.util'
import { MiddlewareFn } from 'telegraf'

export const trackedCommand: MiddlewareFn<CommandContext> = async (ctx) => {
  const trackedProducts = ctx.trackedProducts
  if (trackedProducts.length === 0) {
    return ctx.reply('❌ You are not tracking any products.')
  }

  const products = await amulService.getProteinProducts()

  const message: string = [
    `<b>Tracked Products</b>`,
    ...(await Promise.all(
      trackedProducts.map(async (trackedProduct, index) => {
        const product = products.find((p) => p.sku === trackedProduct.sku)

        if (!product) {
          logToChannel(
            `❌ Product with SKU ${trackedProduct.sku} not found in tracked command.`
          )
          return `❌ Product with SKU ${trackedProduct.sku} not found.`
        }

        const isAvlblToPurchase = isAvailableToPurchase(product)

        const trackBtn = `<b><a href="${await startCommandLink(
          `track_${product.sku}`
        )}">[Track]</a></b>`

        const untrackBtn = `<b><a href="${await startCommandLink(
          `untrack_${product.sku}`
        )}">[Untrack]</a></b>`

        const isTracked = ctx.trackedProducts.some((p) => p.sku === product.sku)
        console.log('isTracked:', isTracked)

        return [
          formatProductDetails(product, isAvlblToPurchase, index),
          isTracked ? untrackBtn : isAvlblToPurchase ? null : trackBtn
        ].join('\n')
      })
    ))
  ].join('\n\n')

  await ctx.reply(message, {
    parse_mode: 'HTML',
    link_preview_options: {
      is_disabled: true
    }
  })
}
