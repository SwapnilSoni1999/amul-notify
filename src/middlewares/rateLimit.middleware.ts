import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'

const RATE_LIMIT = 5 // max allowed actions
const WINDOW_MS = 60 * 1000 // 1 minute in milliseconds

// Map<userId, timestamp[]>
const userSearchLog = new Map<number, number[]>()

export const rateLimit: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.from?.id) {
    return ctx.reply(`${emojis.crossMark} User ID not found.`)
  }

  const userId = ctx.from.id
  const messageText =
    ctx.message && 'text' in ctx.message ? ctx.message.text : ''

  const now = Date.now()
  const logs = userSearchLog.get(userId) || []

  // Remove timestamps older than WINDOW_MS
  const recentLogs = logs.filter((ts) => now - ts < WINDOW_MS)
  recentLogs.push(now)

  if (recentLogs.length > RATE_LIMIT) {
    return ctx.reply(
      `🚫 Rate limit exceeded. Looks like you're going too fast. \nPlease try again after couple of minutes.`
    )
  }

  userSearchLog.set(userId, recentLogs)

  console.log('rateLimit passed for user:', userId, 'message:', messageText)

  await next()
}

// Clear expired logs every 5 minutes
export const clearExpiredLogs = () => {
  const now = Date.now()
  userSearchLog.forEach((logs, userId) => {
    const recentLogs = logs.filter((ts) => now - ts < WINDOW_MS)
    if (recentLogs.length === 0) {
      userSearchLog.delete(userId)
    } else {
      userSearchLog.set(userId, recentLogs)
    }
  })
  console.log('Expired logs cleared. Current log size:', userSearchLog.size)
}

// Set an interval to clear expired logs every 5 minutes
setInterval(clearExpiredLogs, 5 * 60 * 1000)
