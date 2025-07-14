import { settingsCommand } from '@/commands/settings.command'
import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const toggleTrackingStyleAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  console.log('Inside toggleTrackingStyleAction')
  await ctx.answerCbQuery(`Updating tracking style`) // Acknowledge the callback query
  const currentStyle = ctx.user?.settings?.trackingStyle || 'once'
  const newStyle = currentStyle === 'once' ? 'always' : 'once'

  ctx.user.set('settings.trackingStyle', newStyle)
  await ctx.user.save()
  settingsCommand(ctx, next)
}
