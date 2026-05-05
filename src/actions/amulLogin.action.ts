import { ActionContext } from '@/types/context.types'
import { isAutoOrderConfigured } from '@/utils/autoOrder.util'
import { MiddlewareFn } from 'telegraf'

export const amulLoginAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  if (!isAutoOrderConfigured()) {
    await ctx.answerCbQuery('Auto-ordering is not configured')
    return next()
  }

  await ctx.answerCbQuery('Starting Amul login')
  await ctx.scene.enter('amul-login')
  return next()
}
