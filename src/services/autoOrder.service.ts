import { hasValidAutoBookingPayment } from '@/services/payment.service'
import { MyContext } from '@/types/context.types'
import { isAutoOrderConfigured, isLoggedIn } from '@/utils/autoOrder.util'
import { emojis } from '@/utils/emoji.util'

export const toggleAutoOrder = async (
  ctx: MyContext,
  sku: string,
  action: 'add' | 'remove'
) => {
  if (!isAutoOrderConfigured()) {
    return ctx.reply(`${emojis.crossMark} Auto-ordering is not configured.`, {
      parse_mode: 'HTML'
    })
  }

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
      [
        `${emojis.crossMark} You are not tracking the product: <b>${product.name}</b>`,
        'Please track the product before adding it to auto order.'
      ].join('\n'),
      { parse_mode: 'HTML' }
    )
  }

  if (action === 'add') {
    if (!ctx.user.orderSettings.enabled) {
      return ctx.reply(
        [
          `${emojis.warning} Auto-ordering is not enabled.`,
          `Please send /autoorder and enable auto-booking payment before adding products to auto-order.`
        ].join('\n'),
        { parse_mode: 'HTML' }
      )
    }

    const hasValidPayment = await hasValidAutoBookingPayment(ctx.user._id)
    if (!hasValidPayment) {
      return ctx.reply(
        [
          `${emojis.warning} Auto-booking payment is required.`,
          `Please send /autoorder and enable auto-booking payment before adding products to auto-order.`
        ].join('\n'),
        { parse_mode: 'HTML' }
      )
    }

    if (!ctx.user.address?.amulId) {
      return ctx.reply(
        [
          `${emojis.warning} Auto-order address is not set.`,
          `Please send /autoorder and set your address before adding products to auto-order.`
        ].join('\n'),
        { parse_mode: 'HTML' }
      )
    }

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
