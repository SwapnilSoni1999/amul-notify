import { MiddlewareFn } from 'telegraf'
import { adminCommands, userCommands } from '@/config'
import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { isAutoOrderConfigured } from '@/utils/autoOrder.util'
import cacheService from '@/services/cache.service'
import { logToChannel } from '@/utils/logger.util'

export const setCommands: MiddlewareFn<MyContext> = async (ctx, next) => {
  if (!ctx.from) {
    return ctx.reply(`${emojis.crossMark} Unable to identify user.`)
  }

  const user = ctx.user

  if (!user) {
    throw new Error('sessionMiddleware must be used before setCommands')
  }

  const isSet = await cacheService.setCommandsData
    .get({
      tgId: ctx.from.id
    })
    .catch((err) => {
      logToChannel(`Redis error in setCommands middleware: ${err.message}`)
      return false
    })

  if (isSet) {
    console.log(
      `Commands already set for user ${user.tgUsername} (${user.tgId}) in chat ${ctx.chat?.id}`
    )
    return next()
  }

  const commands = userCommands.filter((command) => {
    return isAutoOrderConfigured() || command.command !== 'autoorder'
  })

  if (user.isAdmin) {
    commands.push(...adminCommands)
  }

  await ctx.telegram.setMyCommands(commands, {
    scope: {
      type: 'chat',
      chat_id: ctx.chat!.id
    }
  })

  await cacheService.setCommandsData.set(
    {
      tgId: ctx.from.id
    },
    true
  )

  console.log(
    `Commands set for user ${user.tgUsername} (${user.tgId}) in chat ${ctx.chat?.id}`
  )

  return next()
}
