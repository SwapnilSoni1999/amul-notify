import { startCommand } from '@/commands/start.command'
import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const homeAction: MiddlewareFn<ActionContext> = async (ctx, next) => {
  await ctx.answerCbQuery('Opening home')
  await ctx.deleteMessage().catch(() => {
    // ignore if message cannot be deleted
  })
  return startCommand(ctx as never, next)
}
