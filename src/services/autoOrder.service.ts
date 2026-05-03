import { MyContext } from '@/types/context.types'
import { isLoggedIn } from '@/utils/autoOrder.util'
import { emojis } from '@/utils/emoji.util'

export const toggleAutoOrder = async (
  ctx: MyContext,
  sku: string,
  action: 'add' | 'remove'
) => {
  if (!ctx.user.orderSettings.permitted) {
    return ctx.reply(
      `${emojis.crossMark} You do not have permission to use this feature.`,
      { parse_mode: 'HTML' }
    )
  }

  const products = await ctx.amul.getProteinProducts()
  const product = products.find((p) => p.sku === sku)
  if (!product) {
    return ctx.reply(`${emojis.crossMark} Product not found: <b>${sku}</b>`, {
      parse_mode: 'HTML'
    })
  }

  const existingProduct = ctx.trackedProducts.find((p) => p.sku === sku)

  if (!existingProduct) {
    return ctx.reply(
      `${emojis.crossMark} You are not tracking the product: <b>${product.name}</b>`,
      { parse_mode: 'HTML' }
    )
  }

  if (action === 'add') {
    const loggedIn = isLoggedIn(ctx.user)

    if (!loggedIn) {
      await ctx.reply(
        `${emojis.crossMark} You are not logged in to the Amul Auto Order feature. Please login to use this feature.`,
        { parse_mode: 'HTML' }
      )
      await ctx.scene.enter('amul-login')
      return
    }

    ctx.user.orderSettings.skus.push(sku)
    await ctx.user.save()
    return ctx.reply(
      `${emojis.checkMark} <b>Added to auto order:</b> ${product.name}`,
      {
        parse_mode: 'HTML'
      }
    )
  }

  if (action === 'remove') {
    ctx.user.orderSettings.skus = ctx.user.orderSettings.skus.filter(
      (s) => s !== sku
    )
    await ctx.user.save()
    return ctx.reply(
      `${emojis.trash} <b>Removed from auto order:</b> ${product.name}`,
      { parse_mode: 'HTML' }
    )
  }
}
