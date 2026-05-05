import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const amulLoginAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  await ctx.answerCbQuery('Starting Amul login')
  await ctx.scene.enter('amul-login')
  return next()
}
