import { MiddlewareFn } from 'telegraf'
import { adminCommands, userCommands } from '@/config'
import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'

export const setCommands: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.from) {
    return ctx.reply(`${emojis.crossMark} Unable to identify user.`)
  }

  const user = ctx.user

  if (!user) {
    throw new Error('sessionMiddleware must be used before setCommands')
  }

  const commands = [...userCommands]

  if (user.isAdmin) {
    commands.push(...adminCommands)
  }

  await ctx.telegram.setMyCommands(commands, {
    scope: {
      type: 'chat',
      chat_id: ctx.chat!.id
    }
  })
  console.log(
    `Commands set for user ${user.tgUsername} (${user.tgId}) in chat ${ctx.chat?.id}`
  )

  return next()
}
