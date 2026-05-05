import { autoOrderCommand } from '@/commands/autoorder.command'
import { ActionContext } from '@/types/context.types'
import { isAutoOrderConfigured } from '@/utils/autoOrder.util'
import { MiddlewareFn } from 'telegraf'

export const amulLogoutAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  if (!isAutoOrderConfigured()) {
    await ctx.answerCbQuery('Auto-ordering is not configured')
    return next()
  }

  ctx.user.cookies.splice(0, ctx.user.cookies.length)
  ctx.user.set('amulUserId', undefined)
  ctx.user.set('amulCartId', undefined)
  ctx.user.set('address', undefined)
  await ctx.user.save()

  await ctx.answerCbQuery('Logged out from Amul')
  return autoOrderCommand(ctx, next)
}
