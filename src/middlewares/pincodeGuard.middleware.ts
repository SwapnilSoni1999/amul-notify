import { MyContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const pincodeGuard: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.user.pincode || !ctx.user.substore) {
    return ctx.reply(
      '❗️ Please set your pincode first using /setpincode command to use this feature.'
    )
  }
  return next()
}
