import { ActionContext } from '@/types/context.types'
import { isAutoOrderConfigured } from '@/utils/autoOrder.util'
import { MiddlewareFn } from 'telegraf'

export const setAddressAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  if (!isAutoOrderConfigured()) {
    await ctx.answerCbQuery('Auto-ordering is not configured')
    return next()
  }

  await ctx.answerCbQuery('Setting address') // Acknowledge the callback query
  await ctx.scene.enter('amul-set-address')
  return next() // to logger middleware
}
