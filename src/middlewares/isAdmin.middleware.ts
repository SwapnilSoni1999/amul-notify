import { MyContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const isAdmin: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.user.isAdmin) {
    return ctx.reply('🚫 You do not have permission to use this command.')
  }
  return next()
}
