import { autoOrderCommand } from '@/commands/autoorder.command'
import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const toggleAutoOrderEnabledAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  const currentStatus = ctx.user?.orderSettings.enabled || false
  const newStatus = !currentStatus

  ctx.user.set('orderSettings.enabled', newStatus)
  await ctx.user.save()

  return autoOrderCommand(ctx, next)
}
