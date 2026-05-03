import { HydratedUser } from '@/models/user.model'
import { startCommandLink } from './telegram.util'
import { createLink } from './bot.utils'

export const getAutoOrderButton = async (user: HydratedUser, sku: string) => {
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

export const isLoggedIn = (user: HydratedUser): boolean => {
  return (
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
