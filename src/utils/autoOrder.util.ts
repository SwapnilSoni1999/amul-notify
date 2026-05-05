import { HydratedUser, IUser } from '@/models/user.model'
import env from '@/env'
import { startCommandLink } from './telegram.util'
import { createLink } from './bot.utils'
import { inlineKeyboard } from 'telegraf/markup'
import { ACTIONS } from '@/config'
import { Markup } from 'telegraf'

export const isAutoOrderConfigured = (): boolean => {
  return Boolean(
    env.ORDER_SERVER_API_URL?.trim() && env.ORDER_SERVER_API_KEY?.trim()
  )
}

export const getAutoOrderButton = async (user: HydratedUser, sku: string) => {
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

export const buildAutoOrderOverviewMessage = (user: HydratedUser): string => {
  if (!isAutoOrderConfigured()) {
    return `Auto-ordering is not configured for this bot.`
  }

  const loggedIn = isLoggedIn(user)
  const isPermitted = user.orderSettings.permitted

  const message = isPermitted
    ? [
        `Your current auto-order settings:`,
        `- <b>Auto-ordering</b>: ${user.orderSettings.enabled ? 'Enabled' : 'Disabled'}`,
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
