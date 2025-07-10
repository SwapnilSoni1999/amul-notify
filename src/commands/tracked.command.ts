import { getLastInStockAt } from '@/services/amul.service'
import { CommandContext } from '@/types/context.types'
import { isAvailableToPurchase } from '@/utils/amul.util'
import { emojis } from '@/utils/emoji.util'
import { formatProductDetails } from '@/utils/format.util'
import { logToChannel } from '@/utils/logger.util'
import { startCommandLink } from '@/utils/telegram.util'
import { MiddlewareFn } from 'telegraf'

export const trackedCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const trackedProducts = ctx.trackedProducts
  if (trackedProducts.length === 0) {
    ctx.reply(`${emojis.crossMark} You are not tracking any products.`)
    return next()
  }

  const products = await ctx.amul.getProteinProducts()

  const message: string = [
    `<b>Tracked Products</b> (${ctx.amul.getPincode()} - ${ctx.amul.getSubstore()})`,
    ...(await Promise.all(
      trackedProducts.map(async (trackedProduct, index) => {
        const product = products.find((p) => p.sku === trackedProduct.sku)

        if (!product) {
          logToChannel(
            `${emojis.crossMark} Product with SKU ${trackedProduct.sku} not found in tracked command.`
          )
          return `${emojis.crossMark} Product with SKU ${trackedProduct.sku} not found.`
        }

        const isAvlblToPurchase = isAvailableToPurchase(product)

        const untrackBtn = `<b><a href="${await startCommandLink(
          `untrack_${product.sku}`
        )}">[Untrack]</a></b>`

        const toggleBtn = `<b><a href="${await startCommandLink(
          `toggle_${product.sku}`
        )}">[Toggle]</a></b>`

        const isTrackedAlways = trackedProduct.trackAlways || false
        const trackType = isTrackedAlways ? '🔁 Always' : '🔍 Once'

        const lastSeen = await getLastInStockAt(
          product.sku,
          ctx.amul.getSubstore()!
        )

        return [
          formatProductDetails(
            product,
            isAvlblToPurchase,
            index,
            lastSeen?.lastSeenInStockAt
          ),
          `<i>Tracking: ${trackType}</i> | ${toggleBtn} | ${untrackBtn}`
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

  next()
}
