import { MyContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const onlyPvtChat: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (ctx.chat?.type !== 'private') {
    return ctx.reply('❌ This bot only can be used in private chats.')
  }
  return next()
}
