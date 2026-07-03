import { startCommand } from '@/commands/start.command'
import { ActionContext } from '@/types/context.types'
import { safeDeleteMessage } from '@/utils/telegram.util'
import { MiddlewareFn } from 'telegraf'

export const homeAction: MiddlewareFn<ActionContext> = async (ctx, next) => {
  await ctx.answerCbQuery('Opening home')
  await safeDeleteMessage(ctx)
  return startCommand(ctx as never, next)
}
