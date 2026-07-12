import { getLastInStockAt } from '@/services/amul.service'
import { MyContext } from '@/types/context.types'
import { AmulProduct } from '@/types/amul.types'
import { isAvailableToPurchase } from './amul.util'
import { getAutoOrderButton } from './autoOrder.util'
import { formatProductDetails } from './format.util'
import { startCommandLink } from './telegram.util'

interface ProductListItemOptions {
  index: number
  remainingNotifyCount?: number
  showProtein?: boolean
}

export const renderProductListItem = async (
  ctx: MyContext,
  product: AmulProduct,
  opts: ProductListItemOptions
) => {
  const isAvlblToPurchase = isAvailableToPurchase(product)
  const isTracked = ctx.trackedProducts.some((p) => p.sku === product.sku)
  const isFav = ctx.user.favSkus.includes(product.sku)

  const [trackUrl, untrackUrl, favUrl, autoOrderBtn, lastSeen] =
    await Promise.all([
      startCommandLink(`track_${product.sku}`),
      startCommandLink(`untrack_${product.sku}`),
      startCommandLink(`fav_${product.sku}`),
      getAutoOrderButton(ctx.user, product.sku),
      getLastInStockAt(product.sku, ctx.amul.getSubstore()!)
    ])

  const trackBtn = `<b><a href="${trackUrl}">[Track]</a></b>`
  const untrackBtn = `<b><a href="${untrackUrl}">[Untrack]</a></b>`
  const favBtn = `<b><a href="${favUrl}">${
    isFav ? '[Unfavourite]' : '[Favourite]'
  }</a></b>`

  return [
    formatProductDetails(product, isAvlblToPurchase, opts.index, {
      lastSeenInStockAt: lastSeen?.lastSeenInStockAt,
      remainingNotifyCount: opts.remainingNotifyCount,
      showProtein:
        opts.showProtein ?? product.categories?.includes('protein') ?? false
    }),
    `${isTracked ? untrackBtn : trackBtn} | ${favBtn}`,
    autoOrderBtn ? `<b>${autoOrderBtn}</b>` : null
  ]
    .filter(Boolean)
    .join('\n')
}
