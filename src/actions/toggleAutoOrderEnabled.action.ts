import { autoOrderCommand } from '@/commands/autoorder.command'
import {
  AUTO_BOOKING_PAYMENT_LABEL,
  AUTO_BOOKING_PAYMENT_VALID_DAYS
} from '@/config'
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
      const payment = await createAutoBookingPaymentLink(ctx.user)
      const keyboard = inlineKeyboard([
        [
          {
            text: `Pay ${AUTO_BOOKING_PAYMENT_LABEL}`,
            url: payment.shortUrl
          }
        ]
      ])

      await ctx.answerCbQuery('Payment required')
      await ctx.reply(
        [
          `${emojis.info} <b>Payment required</b>`,
          `Auto-booking access is valid for ${AUTO_BOOKING_PAYMENT_VALID_DAYS} days after payment.`,
          `Please complete the ${AUTO_BOOKING_PAYMENT_LABEL} payment to enable auto-booking.`
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
