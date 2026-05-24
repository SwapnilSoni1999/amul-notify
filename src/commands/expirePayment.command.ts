import { TIMEZONE } from '@/config'
import dayjs from '@/libs/dayjs.lib'
import UserModel, { HydratedUser } from '@/models/user.model'
import { expireActiveAutoBookingPayments } from '@/services/payment.service'
import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'

const USAGE = `${emojis.info} Usage: /expirepayment <@username_or_tgId>`
const TELEGRAM_ID_REGEX = /^\d+$/
const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const formatUserLabel = (user: HydratedUser, fallback: string): string => {
  if (user.tgUsername) {
    return `@${user.tgUsername}`
  }

  if (user.tgId) {
    return String(user.tgId)
  }

  return fallback
}

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

  const identifier = identifierArg.trim().replace(/^@/, '')
  const isTgId = TELEGRAM_ID_REGEX.test(identifier)
  let user: HydratedUser | null
  let targetLabel: string
  let notFoundLabel: string

  if (isTgId) {
    const tgId = Number(identifier)

    if (!Number.isSafeInteger(tgId) || tgId <= 0) {
      await ctx.reply(`${emojis.warning} Invalid Telegram ID. ${USAGE}`)
      return next()
    }

    user = await UserModel.findOne({
      tgId
    })
    targetLabel = String(tgId)
    notFoundLabel = `with Telegram ID ${tgId}`
  } else {
    const username = identifier

    if (!TELEGRAM_USERNAME_REGEX.test(username)) {
      await ctx.reply(
        `${emojis.warning} Invalid Telegram username or ID. ${USAGE}`
      )
      return next()
    }

    user = await UserModel.findOne({
      tgUsername: {
        $regex: new RegExp(`^${escapeRegExp(username)}$`, 'i')
      }
    })
    targetLabel = `@${username}`
    notFoundLabel = targetLabel
  }

  if (!user) {
    await ctx.reply(`${emojis.crossMark} User ${notFoundLabel} was not found.`)
    return next()
  }

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
