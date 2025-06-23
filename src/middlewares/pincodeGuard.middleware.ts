import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'

export const pincodeGuard: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.user.pincode || !ctx.user.substore) {
    return ctx.reply(
      `${emojis.exclamation} Please set your pincode first using /setpincode command to use this feature.`
    )
  }
  return next()
}
