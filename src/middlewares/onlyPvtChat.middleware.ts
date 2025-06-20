import { MyContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const onlyPvtChat: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (ctx.chat?.type !== 'private') {
    return
  }
  return next()
}
