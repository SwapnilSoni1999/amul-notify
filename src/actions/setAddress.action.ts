import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const setAddressAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  await ctx.answerCbQuery('Setting address') // Acknowledge the callback query
  await ctx.scene.enter('amul-set-address')
  return next() // to logger middleware
}
