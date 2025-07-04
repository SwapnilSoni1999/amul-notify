import { MiddlewareFn, TelegramError } from 'telegraf'
import { logToChannel } from './logger.util'
import { emojis } from './emoji.util'
import { MyContext } from '@/types/context.types'
import UserModel from '@/models/user.model'
import ProductModel from '@/models/product.model'

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
          `${emojis.warning} User ${ctx.from?.id} has blocked the bot. Removing from database.`
        )
        const deleteUser = await UserModel.findOneAndDelete({
          tgId: ctx.from?.id
        })
        await ProductModel.deleteMany({ trackedBy: deleteUser?._id })

        return // Don't propagate further
      }

      console.error('Unhandled Telegraf error:', err)
      logToChannel(
        `${emojis.warning} Unhandled Telegraf error: ${err.message || err}`
      )
      try {
        await ctx.reply?.(
          `${emojis.warning} An unexpected error occurred. Please try again later.`
        )
      } catch (e) {
        console.log('[IGNORE] Failed to send error reply:', e)
        // fail silently if reply itself fails
      }
    }
  }
}
