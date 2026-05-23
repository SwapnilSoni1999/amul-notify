import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const autoOrderHowItWorksAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  await ctx.answerCbQuery('How auto-ordering works')
  await ctx.reply(
    [
      `<b>How auto-ordering works</b>`,
      ``,
      `1. Enable the auto-order feature from /autoorder.`,
      `2. Add products to auto order from /products.`,
      `3. Verify and view all added products with /tracked.`,
      `4. Once an item appears in stock, the bot will attempt to place the order.`,
      `5. If the order is placed successfully, the bot will share a payment link with you.`,
      `6. The payment link is valid for 15 minutes only.`
    ].join('\n'),
    {
      parse_mode: 'HTML'
    }
  )

  return next()
}
