import { ActionContext, CommandContext, MyContext } from '@/types/context.types'
import {
  clearUserAutoBookingAccess,
  getLatestAutoBookingPayment
} from '@/services/payment.service'
import { emojis } from '@/utils/emoji.util'
import {
  buildAutoOrderKeyboard,
  buildAutoOrderOverviewMessage,
  isAutoOrderConfigured
} from '@/utils/autoOrder.util'
import { MiddlewareFn } from 'telegraf'

export const autoOrderCommand: MiddlewareFn<
  CommandContext | ActionContext | MyContext
> = async (ctx, next) => {
  if (!isAutoOrderConfigured()) {
    await ctx.reply(`Auto-ordering is not configured for this bot.`)
    return next()
  }

  const user = ctx.user
  let payment = await getLatestAutoBookingPayment(user._id)
  const isPaymentExpired =
    !payment ||
    payment.status !== 'paid' ||
    !payment.validUntil ||
    payment.validUntil <= new Date()

  if (user.orderSettings.enabled && isPaymentExpired) {
    if (payment?.status === 'paid') {
      payment.status = 'expired'
      payment.expiredNotifiedAt = new Date()
      await payment.save()
    }

    await clearUserAutoBookingAccess(user)

    const expiredMessage = [
      `${emojis.warning} <b>Auto-booking payment expired</b>`,
      `Your auto-booking access has expired, so your auto-booking products were cleared and your Amul session was logged out.`,
      ``,
      `To continue using auto-booking, please renew your payment.`
    ].join('\n')

    if (ctx.updateType === 'callback_query') {
      await ctx.answerCbQuery('Payment expired')
      await ctx.reply(expiredMessage, {
        parse_mode: 'HTML'
      })
    } else {
      await ctx.reply(expiredMessage, {
        parse_mode: 'HTML'
      })
    }

    payment = await getLatestAutoBookingPayment(user._id)
  }

  if (!user.orderSettings.permitted) {
    await ctx.reply(
      `Sorry, you are not permitted to use auto-ordering. Please contact /support.`
    )
    return next() // to logger middleware
  }

  const message = buildAutoOrderOverviewMessage(user, payment)
  const keyboard = buildAutoOrderKeyboard(user)

  if (ctx.updateType === 'callback_query') {
    await ctx.editMessageText(message, {
      reply_markup: keyboard.reply_markup,
      parse_mode: 'HTML'
    })
  } else {
    await ctx.reply(message, {
      reply_markup: keyboard.reply_markup,
      parse_mode: 'HTML'
    })
  }

  return next() // to logger middleware
}
