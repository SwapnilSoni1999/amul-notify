import { autoOrderCommand } from '@/commands/autoorder.command'
import { ActionContext } from '@/types/context.types'
import { isAutoOrderConfigured } from '@/utils/autoOrder.util'
import { MiddlewareFn } from 'telegraf'

export const toggleAutoOrderEnabledAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  if (!isAutoOrderConfigured()) {
    await ctx.answerCbQuery('Auto-ordering is not configured')
    return next()
  }

  const currentStatus = ctx.user?.orderSettings.enabled || false
  const newStatus = !currentStatus

  ctx.user.set('orderSettings.enabled', newStatus)
  await ctx.user.save()

  return autoOrderCommand(ctx, next)
}
