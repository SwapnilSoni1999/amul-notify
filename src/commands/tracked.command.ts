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

        const trackBtn = `<b><a href="${await startCommandLink(
          `track_${product.sku}`
        )}">[Track]</a></b>`

        const untrackBtn = `<b><a href="${await startCommandLink(
          `untrack_${product.sku}`
        )}">[Untrack]</a></b>`

        const isFav = ctx.user.favSkus.includes(product.sku)

        const favBtn = `<b><a href="${await startCommandLink(
          `fav_${product.sku}`
        )}">${isFav ? '[Unfavourite]' : '[Favourite]'}</a></b>`

        const isTracked = ctx.trackedProducts.some((p) => p.sku === product.sku)
        console.log('isTracked:', isTracked)

        const lastSeen = await getLastInStockAt(
          product.sku,
          ctx.amul.getSubstore()!
        )

        return [
          formatProductDetails(
            product,
            isAvlblToPurchase,
            index,
            lastSeen?.lastSeenInStockAt,
            ctx.user.settings?.trackingStyle === 'always'
              ? trackedProduct.remainingNotifyCount
              : undefined
          ),
          `${isTracked ? untrackBtn : trackBtn} | ${favBtn}`
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
