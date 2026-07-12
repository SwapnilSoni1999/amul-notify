import type { HydratedUser, IUser } from '@/models/user.model'
import type { CookieExpiryRecord } from '@/types/orderApi.types'

type StoredCookie = IUser['cookies'][number]

export function getCookieValue(
  cookieString: string,
  name: string
): string | undefined {
  for (const part of cookieString.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.includes('=')) {
      continue
    }
    const [key, ...rest] = trimmed.split('=')
    if (key === name) {
      return rest.join('=')
    }
  }
  return undefined
}

export function isStoredCookieExpired(
  cookie: StoredCookie,
  now = new Date()
): boolean {
  if (cookie.isExpired) {
    return true
  }

  if (!cookie.expiresAt) {
    return false
  }

  const expiresAt = new Date(cookie.expiresAt)
  return !Number.isFinite(expiresAt.getTime()) || expiresAt <= now
}

export function serializeStoredCookies(
  cookies: IUser['cookies'],
  now = new Date()
): string {
  const activeCookies = new Map<string, string>()

  for (const cookie of cookies) {
    if (!cookie.key || !cookie.value || isStoredCookieExpired(cookie, now)) {
      continue
    }
    activeCookies.set(cookie.key, cookie.value)
  }

  return [...activeCookies].map(([key, value]) => `${key}=${value}`).join('; ')
}

export function replaceUserCookies(
  user: HydratedUser,
  cookies: CookieExpiryRecord[]
): void {
  user.set(
    'cookies',
    cookies.map((cookie) => ({
      ...cookie,
      expiresAt: cookie.expiresAt ? new Date(cookie.expiresAt) : undefined
    }))
  )
}

export function clearUserAmulSession(user: HydratedUser): void {
  user.set('cookies', [])
  user.set('amulUserId', undefined)
  user.set('amulCartId', undefined)
  user.set('orderSettings.enabled', false)
}
