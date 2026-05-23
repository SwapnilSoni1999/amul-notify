import { HydratedUser, IUser } from '@/models/user.model'
import env from '@/env'
import dayjs from '@/libs/dayjs.lib'
import { HydratedPayment } from '@/models/payment.model'
import { hasValidAutoBookingPayment } from '@/services/payment.service'
import { startCommandLink } from './telegram.util'
import { createLink } from './bot.utils'
import { inlineKeyboard } from 'telegraf/markup'
import { ACTIONS, TIMEZONE } from '@/config'
import { Markup } from 'telegraf'

const hasValue = (value?: string): boolean => {
  return Boolean(value?.trim())
}

const isValidUrl = (value?: string): boolean => {
  if (!hasValue(value)) {
    return false
  }

  try {
    new URL(value!)
    return true
  } catch {
    return false
  }
}

export const getMissingAutoOrderConfig = (): string[] => {
  const missingConfig: string[] = []

  if (!hasValue(env.ORDER_SERVER_API_URL)) {
    missingConfig.push('ORDER_SERVER_API_URL')
  }

  if (!hasValue(env.ORDER_SERVER_API_KEY)) {
    missingConfig.push('ORDER_SERVER_API_KEY')
  }

  if (!hasValue(env.RAZORPAY_API_KEY)) {
    missingConfig.push('RAZORPAY_API_KEY')
  }

  if (!hasValue(env.RAZORPAY_API_SECRET)) {
    missingConfig.push('RAZORPAY_API_SECRET')
  }

  if (!isValidUrl(env.RAZORPAY_REDIRECT_URL)) {
    missingConfig.push('RAZORPAY_REDIRECT_URL')
  }

  return missingConfig
}

export const isAutoOrderConfigured = (): boolean => {
  return getMissingAutoOrderConfig().length === 0
}

export const canAddAutoOrderProducts = async (
  user: HydratedUser
): Promise<boolean> => {
  return Boolean(
    isAutoOrderConfigured() &&
      user.orderSettings.permitted &&
      user.orderSettings.enabled &&
      user.address?.amulId &&
      isLoggedIn(user) &&
      (await hasValidAutoBookingPayment(user._id))
  )
}

export const getAutoOrderButton = async (
  user: HydratedUser,
  sku: string,
  canAddAutoOrder?: boolean
) => {
  if (!isAutoOrderConfigured()) {
    return ''
  }

  if (!user.orderSettings.permitted) {
    return ''
  }

  const isAlreadyInAutoOrder = user.orderSettings.skus.includes(sku)

  if (isAlreadyInAutoOrder) {
    return createLink(
      await startCommandLink(`removeautoorder_${sku}`),
      '[Remove Auto Order]'
    )
  }

  const canAdd = canAddAutoOrder ?? (await canAddAutoOrderProducts(user))

  if (!canAdd) {
    return ''
  }

  return createLink(
    await startCommandLink(`addautoorder_${sku}`),
    '[Add Auto Order]'
  )
}

export const isLoggedIn = (user: HydratedUser | IUser): boolean => {
  return (
    isAutoOrderConfigured() &&
    !!user.phone &&
    user.phone.length === 10 &&
    !!user.cookies.find((cookie) => {
      return (
        cookie.key === 'jsessionid' &&
        cookie.value.length > 0 &&
        !cookie.isExpired
      )
    }) &&
    !!user.amulUserId &&
    !!user.amulCartId
  )
}

export const buildAutoOrderKeyboard = (user: HydratedUser) => {
  const isConfigured = isAutoOrderConfigured()
  const loggedIn = isLoggedIn(user)
  const isEnabled = user.orderSettings.enabled

  const keyboard = inlineKeyboard(
    [
      isConfigured
        ? Markup.button.callback(
            user.orderSettings.enabled
              ? 'Disable Auto-Ordering'
              : 'Enable Auto-Ordering',
            ACTIONS.settings.autoOrder.toggleEnabled
          )
        : null,
      isConfigured
        ? Markup.button.callback(
            'How it works',
            ACTIONS.settings.autoOrder.howItWorks
          )
        : null,
      isConfigured && !loggedIn && isEnabled
        ? Markup.button.callback(
            'Login to Amul',
            ACTIONS.settings.autoOrder.login
          )
        : null,
      isConfigured && loggedIn && isEnabled
        ? Markup.button.callback(
            'Logout from Amul',
            ACTIONS.settings.autoOrder.logout
          )
        : null,
      isConfigured && loggedIn && isEnabled
        ? Markup.button.callback(
            'Set Address',
            ACTIONS.settings.autoOrder.setAddress
          )
        : null,
      Markup.button.callback('Home', ACTIONS.home)
    ].map((btn) =>
      // take whole row
      btn ? [btn] : []
    )
  )

  return keyboard
}

export const buildAutoOrderOverviewMessage = (
  user: HydratedUser,
  payment?: HydratedPayment | null
): string => {
  if (!isAutoOrderConfigured()) {
    return `Auto-ordering is not configured for this bot.`
  }

  const loggedIn = isLoggedIn(user)
  const isPermitted = user.orderSettings.permitted
  const subscriptionDetails = getAutoBookingSubscriptionDetails(payment)

  const message = isPermitted
    ? [
        `Your current auto-order settings:`,
        `- <b>Auto-ordering</b>: ${user.orderSettings.enabled ? 'Enabled' : 'Disabled'}`,
        `- <b>Subscription</b>: ${subscriptionDetails}`,
        `- <b>Address</b>: ${
          user.address
            ? [
                `${user.address.address}`,
                `${user.address.city}, ${user.address.state} ${user.address.zip}`
              ]
                .map((l) => '\t' + l)
                .join('\n')
            : 'Not set'
        }`,
        `- <b>Phone</b>: ${user.phone || 'Not set'}`,
        `- <b>Logged In</b>: ${loggedIn ? 'Yes' : 'No'}`
      ]
    : [
        `Sorry, you are not permitted to use auto-ordering. Please contact /support.`
      ]
  return message.join('\n')
}

const getAutoBookingSubscriptionDetails = (
  payment?: HydratedPayment | null
): string => {
  if (!payment?.validUntil) {
    return 'Not active'
  }

  const validUntil = dayjs(payment.validUntil).tz(TIMEZONE)
  const now = dayjs().tz(TIMEZONE)

  if (payment.status !== 'paid' || !validUntil.isAfter(now)) {
    return `Expired on ${validUntil.format('DD MMM YYYY, hh:mm A')}`
  }

  const daysRemaining = Math.max(validUntil.diff(now, 'day'), 0)

  return [
    `Active`,
    `expires ${validUntil.format('DD MMM YYYY, hh:mm A')}`,
    `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
  ].join(' | ')
}
