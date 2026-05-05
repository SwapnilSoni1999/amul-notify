import { ActionContext, CommandContext, MyContext } from '@/types/context.types'
import {
  buildAutoOrderKeyboard,
  buildAutoOrderOverviewMessage,
  isAutoOrderConfigured
} from '@/utils/autoOrder.util'
import { MiddlewareFn } from 'telegraf'

export const autoOrderCommand: MiddlewareFn<
  CommandContext | ActionContext | MyContext
> = async (ctx, next) => {
  if (!isAutoOrderConfigured()) {
    await ctx.reply(`Auto-ordering is not configured for this bot.`)
    return next()
  }

  const user = ctx.user
  if (!user.orderSettings.permitted) {
    await ctx.reply(
      `Sorry, you are not permitted to use auto-ordering. Please contact /support.`
    )
    return next() // to logger middleware
  }

  const message = buildAutoOrderOverviewMessage(user)
  const keyboard = buildAutoOrderKeyboard(user)

  if (ctx.updateType === 'callback_query') {
    await ctx.editMessageText(message, {
      reply_markup: keyboard.reply_markup,
      parse_mode: 'HTML'
    })
  } else {
    await ctx.reply(message, {
      reply_markup: keyboard.reply_markup,
      parse_mode: 'HTML'
    })
  }

  return next() // to logger middleware
}
