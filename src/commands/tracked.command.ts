import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { logToChannel } from '@/utils/logger.util'
import { renderProductListItem } from '@/utils/productMessage.util'
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

  const products = await ctx.amul.getAmulProducts()

  const message: string = [
    `<b>Tracked Products</b> (${ctx.user.pincode} - ${ctx.user.substore})`,
    ...(await Promise.all(
      trackedProducts.map(async (trackedProduct, index) => {
        const product = products.find((p) => p.sku === trackedProduct.sku)

        if (!product) {
          logToChannel(
            `${emojis.crossMark} Product with SKU ${trackedProduct.sku} not found in tracked command.`
          )
          return `${emojis.crossMark} Product with SKU ${trackedProduct.sku} not found.`
        }

        return renderProductListItem(ctx, product, {
          index,
          remainingNotifyCount:
            ctx.user.settings?.trackingStyle === 'always'
              ? trackedProduct.remainingNotifyCount
              : undefined
        })
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
