import { substoreSessions } from '@/libs/amulApi.lib'
import { CommandContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const amulSessionsCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const message: string[] = []

  for (const key of substoreSessions.keys()) {
    message.push(`${key.pincode} (${key.substore})`)
  }

  ctx.reply(
    message.length
      ? `📊 Active sessions:\n${message.join('\n')}`
      : '❗️ No active sessions found.',
    {
      parse_mode: 'HTML',
      link_preview_options: {
        is_disabled: true
      }
    }
  )

  return next()
}
