import { TIMEZONE } from '@/config'
import dayjs from '@/libs/dayjs.lib'
import { expireActiveAutoBookingPayments } from '@/services/payment.service'
import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import {
  formatUserLabel,
  lookupUserByTelegramIdentifier
} from '@/utils/userLookup.util'
import { MiddlewareFn } from 'telegraf'

const USAGE = `${emojis.info} Usage: /expirepayment <@username_or_tgId>`

export const expirePaymentCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const args = ctx.message.text.trim().split(/\s+/).slice(1)
  const [identifierArg] = args

  if (args.length !== 1 || !identifierArg) {
    await ctx.reply(USAGE)
    return next()
  }

  const lookupResult = await lookupUserByTelegramIdentifier(identifierArg)
  if (lookupResult.status !== 'found') {
    if (lookupResult.status === 'invalid_tg_id') {
      await ctx.reply(`${emojis.warning} Invalid Telegram ID. ${USAGE}`)
      return next()
    }

    if (lookupResult.status === 'invalid_identifier') {
      await ctx.reply(
        `${emojis.warning} Invalid Telegram username or ID. ${USAGE}`
      )
      return next()
    }

    await ctx.reply(
      `${emojis.crossMark} User ${lookupResult.notFoundLabel} was not found.`
    )
    return next()
  }

  const { user, targetLabel } = lookupResult
  const expiredPayments = await expireActiveAutoBookingPayments(user)
  const expiredAt = dayjs().tz(TIMEZONE).format('DD MMM YYYY, hh:mm A')
  let notified = false

  if (user.tgId) {
    try {
      await ctx.telegram.sendMessage(
        user.tgId,
        [
          `${emojis.warning} <b>Auto-booking access expired</b>`,
          `Your auto-booking payment/subscription has been cancelled.`,
          `Auto-order products, Amul login, cart, and address details were cleared.`,
          ``,
          `Expired at: <b>${expiredAt}</b>`,
          `Use /autoorder to view your current status.`
        ].join('\n'),
        {
          parse_mode: 'HTML'
        }
      )
      notified = true
    } catch (err) {
      console.error(`Failed to notify expired payment user ${user._id}:`, err)
    }
  }

  await ctx.reply(
    [
      `${emojis.checkMark} <b>Auto-booking payment expired</b>`,
      `User: <b>${formatUserLabel(user, targetLabel)}</b>`,
      `Expired active payment(s): <b>${expiredPayments.length}</b>`,
      `Access cleared: <b>Yes</b>`,
      `User notified: <b>${notified ? 'Yes' : 'No'}</b>`
    ].join('\n'),
    {
      parse_mode: 'HTML'
    }
  )

  return next()
}
