import { autoOrderCommand } from '@/commands/autoorder.command'
import { AUTO_BOOKING_PAYMENT_PLANS } from '@/config'
import {
  createAutoBookingPaymentLink,
  hasValidAutoBookingPayment
} from '@/services/payment.service'
import { ActionContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { isAutoOrderConfigured } from '@/utils/autoOrder.util'
import { MiddlewareFn } from 'telegraf'
import { inlineKeyboard } from 'telegraf/markup'

export const toggleAutoOrderEnabledAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  if (!isAutoOrderConfigured()) {
    await ctx.answerCbQuery('Auto-ordering is not configured')
    return next()
  }

  const currentStatus = ctx.user?.orderSettings.enabled || false
  const newStatus = !currentStatus

  if (newStatus) {
    const hasValidPayment = await hasValidAutoBookingPayment(ctx.user._id)

    if (!hasValidPayment) {
      const payments = await Promise.all(
        AUTO_BOOKING_PAYMENT_PLANS.map((plan) =>
          createAutoBookingPaymentLink(ctx.user, plan)
        )
      )
      const keyboard = inlineKeyboard([
        AUTO_BOOKING_PAYMENT_PLANS.map((plan, index) => ({
          text: plan.label,
          url: payments[index].shortUrl
        }))
      ])

      await ctx.answerCbQuery('Payment required')
      await ctx.reply(
        [
          `${emojis.info} <b>Payment required</b>`,
          `Choose one plan below to enable auto-booking.`,
          ``,
          `<b>Terms and Conditions</b>`,
          `- This payment is non-refundable.`,
          `- If you have any issues, contact the developer using /support.`
        ].join('\n'),
        {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        }
      )

      return next()
    }
  }

  ctx.user.set('orderSettings.enabled', newStatus)
  await ctx.user.save()

  return autoOrderCommand(ctx, next)
}
