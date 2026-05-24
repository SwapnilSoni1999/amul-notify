import { TIMEZONE } from '@/config'
import dayjs from '@/libs/dayjs.lib'
import UserModel, { HydratedUser } from '@/models/user.model'
import { grantAutoBookingFreeTrial } from '@/services/payment.service'
import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import ms from 'ms'
import { MiddlewareFn } from 'telegraf'

const USAGE = `${emojis.info} Usage: /freetrial 3d @username|tgId`
const TELEGRAM_ID_REGEX = /^\d+$/
const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const formatValidUntil = (date?: Date): string => {
  if (!date) {
    return 'N/A'
  }

  return dayjs(date).tz(TIMEZONE).format('DD MMM YYYY, hh:mm A')
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

export const freeTrialCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const args = ctx.message.text.trim().split(/\s+/).slice(1)
  const [durationArg, identifierArg] = args

  if (args.length !== 2 || !durationArg || !identifierArg) {
    await ctx.reply(USAGE)
    return next()
  }

  if (!/[a-zA-Z]/.test(durationArg)) {
    await ctx.reply(
      `${emojis.warning} Please include a time unit, for example 3d, 12h, or 30m.`
    )
    return next()
  }

  const durationMs = ms(durationArg as ms.StringValue) as number | undefined

  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    await ctx.reply(`${emojis.warning} Invalid trial duration. ${USAGE}`)
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

  const payment = await grantAutoBookingFreeTrial(user, durationMs, {
    grantedBy: ctx.user
  })
  const durationLabel = ms(durationMs, { long: true })
  const validUntil = formatValidUntil(payment.validUntil ?? undefined)
  let notified = false

  if (user.tgId) {
    try {
      await ctx.telegram.sendMessage(
        user.tgId,
        [
          `${emojis.star} <b>Free trial activated</b>`,
          `You have received a ${durationLabel} free trial for auto-booking.`,
          `Valid until: <b>${validUntil}</b>`,
          ``,
          `Use /autoorder to manage auto-booking.`
        ].join('\n'),
        {
          parse_mode: 'HTML'
        }
      )
      notified = true
    } catch (err) {
      console.error(`Failed to notify free trial user ${user._id}:`, err)
    }
  }

  await ctx.reply(
    [
      `${emojis.checkMark} <b>Free trial granted</b>`,
      `User: <b>${formatUserLabel(user, targetLabel)}</b>`,
      `Duration: <b>${durationLabel}</b>`,
      `Valid until: <b>${validUntil}</b>`,
      `User notified: <b>${notified ? 'Yes' : 'No'}</b>`
    ].join('\n'),
    {
      parse_mode: 'HTML'
    }
  )

  return next()
}
