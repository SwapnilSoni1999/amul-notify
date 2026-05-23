import { MiddlewareFn, TelegramError } from 'telegraf'
import { logToChannel } from './logger.util'
import { emojis } from './emoji.util'
import { MyContext } from '@/types/context.types'
import UserModel from '@/models/user.model'
import ProductModel from '@/models/product.model'
import { AMUL_ERROR_CODE, AmulError } from '@/libs/amulError.lib'
import { getPincodeUnavailableImage } from '@/assets'

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
      } else if (err instanceof AmulError) {
        console.error('AmulError occurred:', err)
        logToChannel(
          `${emojis.warning} AmulError: ${err.message} (Code: ${err.code})`
        )
        if (err.code === AMUL_ERROR_CODE.PINCODE_NOT_FOUND) {
          try {
            const pincodeUnavailableImageBuffer = getPincodeUnavailableImage()
            await ctx.replyWithPhoto(
              {
                source: Buffer.from(pincodeUnavailableImageBuffer)
              },
              {
                caption: [
                  `${emojis.crossMark} No pincode found on Amul's end.`,
                  `Please visit and check for the pincode on Amul's website: https://shop.amul.com`,
                  `If the pincode is indeed not found, unfortunately there's nothing we can do at the moment. You may consider trying again later or using a different pincode.`,
                  '',
                  `If you believe this is an error and the pincode should be found, please contact /support with the details.`
                ].join('\n')
              }
            )
          } catch (e) {
            console.log('[IGNORE] Failed to send pincode error reply:', e)
            // fail silently if reply itself fails
          }
        }
      } else {
        console.error('Unhandled Telegraf and Amul error:', err)
        logToChannel(
          `${emojis.warning} Unhandled Telegraf/Amul error: ${err.message || err}`
        )
      }

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
