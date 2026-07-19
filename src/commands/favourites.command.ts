import { CommandContext } from '@/types/context.types'
import { renderProductListItem } from '@/utils/productMessage.util'
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

  const products = await ctx.amul.getAmulProducts()

  const filteredProducts = products.filter((p) => favSkus.includes(p.sku))

  const message: string = [
    `<b>Tracked Products</b> (${ctx.user.pincode} - ${ctx.user.substore})`,
    ...(await Promise.all(
      filteredProducts.map((product, index) =>
        renderProductListItem(ctx, product, { index })
      )
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
