import { getLastInStockAt } from '@/services/amul.service'
import { CommandContext } from '@/types/context.types'
import { isAvailableToPurchase } from '@/utils/amul.util'
import { formatProductDetails } from '@/utils/format.util'
import { startCommandLink } from '@/utils/telegram.util'
import { MiddlewareFn } from 'telegraf'

export const favouritesCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const favSkus = ctx.user.favSkus

  if (!favSkus?.length) {
    ctx.reply(
      `You have no favourites. Use /products to add some products to your favourites.`
    )
    return next()
  }

  const products = await ctx.amul.getProteinProducts()

  const filteredProducts = products.filter((p) => favSkus.includes(p.sku))

  const message: string = [
    `<b>Tracked Products</b> (${ctx.amul.getPincode()} - ${ctx.amul.getSubstore()})`,
    ...(await Promise.all(
      filteredProducts.map(async (product, index) => {
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
            lastSeen?.lastSeenInStockAt
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

  return next()
}
