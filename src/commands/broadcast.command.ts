import { broadcastMessage } from '@/services/broadcast.service'
import { CommandContext } from '@/types/context.types'
import { getProgressBar } from '@/utils/bot.utils'
import { emojis } from '@/utils/emoji.util'
import { logToChannel } from '@/utils/logger.util'
import { MiddlewareFn } from 'telegraf'

export const broadcastCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const [command, ...text] = ctx.message.text.split(' ')
  // pick all entities
  const entities = ctx.message.entities

  console.log('Broadcast command received:', command, text.join(' '))

  const messageText = text.join(' ').trim()

  if (!messageText) {
    ctx.reply(`${emojis.warning} Please provide a message to broadcast.`)
    return next() // to logger middleware
  }

  console.log('Broadcasting message:', messageText)

  const msg = await ctx.reply(
    `${emojis.megaphone} Broadcasting message: "${messageText}"\n\n` +
      'This may take a while, please be patient...'
  )

  let lastUpdatedAt = Date.now()
  const waitIntervalMs = 2 * 1000 // 2 seconds

  broadcastMessage(
    messageText,
    async (completd, total, failed) => {
      try {
        const percentage = Math.round((completd / total) * 100)
        const progressText = getProgressBar(percentage)

        console.log(progressText)
        console.log(
          `Broadcast progress: ${completd}/${total} (${percentage}%) - Failed: ${failed}`
        )

        if (Date.now() - lastUpdatedAt < waitIntervalMs && completd < total) {
          return // Skip update if not enough time has passed
        }

        lastUpdatedAt = Date.now()

        await ctx.telegram.editMessageText(
          ctx.chat.id,
          msg.message_id,
          undefined,
          `${emojis.megaphone} Broadcasting message: "${messageText}"\n\n` +
            `${progressText} (${completd}/${total})\n` +
            `Failed: ${failed}`
        )
      } catch (err) {
        console.error('Error updating broadcast progress:', err)
        logToChannel(
          `${emojis.crossMark} Error updating broadcast progress: ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      }
    },
    {
      entities: entities
    }
  )
}
