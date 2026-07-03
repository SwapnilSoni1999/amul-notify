import UserModel, { HydratedUser } from '@/models/user.model'

const TELEGRAM_ID_REGEX = /^\d+$/
const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type TelegramUserLookupResult =
  | {
      status: 'found'
      user: HydratedUser
      targetLabel: string
    }
  | {
      status: 'not_found'
      targetLabel: string
      notFoundLabel: string
    }
  | {
      status: 'invalid_tg_id'
    }
  | {
      status: 'invalid_identifier'
    }

export const formatUserLabel = (
  user: HydratedUser,
  fallback: string
): string => {
  if (user.tgUsername) {
    return `@${user.tgUsername}`
  }

  if (user.tgId) {
    return String(user.tgId)
  }

  return fallback
}

export const lookupUserByTelegramIdentifier = async (
  rawIdentifier: string
): Promise<TelegramUserLookupResult> => {
  const identifier = rawIdentifier.trim().replace(/^@/, '')

  if (TELEGRAM_ID_REGEX.test(identifier)) {
    const tgId = Number(identifier)

    if (!Number.isSafeInteger(tgId) || tgId <= 0) {
      return { status: 'invalid_tg_id' }
    }

    const user = await UserModel.findOne({ tgId })
    const targetLabel = String(tgId)

    return user
      ? { status: 'found', user, targetLabel }
      : {
          status: 'not_found',
          targetLabel,
          notFoundLabel: `with Telegram ID ${tgId}`
        }
  }

  if (!TELEGRAM_USERNAME_REGEX.test(identifier)) {
    return { status: 'invalid_identifier' }
  }

  const targetLabel = `@${identifier}`
  const user = await UserModel.findOne({
    tgUsername: {
      $regex: new RegExp(`^${escapeRegExp(identifier)}$`, 'i')
    }
  })

  return user
    ? { status: 'found', user, targetLabel }
    : {
        status: 'not_found',
        targetLabel,
        notFoundLabel: targetLabel
      }
}
