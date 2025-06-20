import { MiddlewareFn, TelegramError } from 'telegraf'
import { logToChannel } from './logger.util'
import { MyContext } from '@/types/context.types'

export function withCatchAsync<T extends MyContext>(
  fn: MiddlewareFn<T>
): MiddlewareFn<T> {
  return async (ctx, next) => {
    try {
      await fn(ctx, next)
    } catch (err: any) {
      // Global error handling logic
      if (
        err instanceof TelegramError &&
        err.code === 403 &&
        err.description?.includes('bot was blocked by the user')
      ) {
        console.warn(`User ${ctx.from?.id} has blocked the bot.`)
        logToChannel(
          `⚠️ User ${ctx.from?.id} has blocked the bot. marking as blocked in Database.`
        )

        return // Don't propagate further
      }

      console.error('Unhandled Telegraf error:', err)
      try {
        await ctx.reply?.(
          '⚠️ An unexpected error occurred. Please try again later.'
        )
      } catch (e) {
        console.log('[IGNORE] Failed to send error reply:', e)
        // fail silently if reply itself fails
      }
    }
  }
}
