import { broadcastMessage } from '@/services/broadcast.service'
import { CommandContext } from '@/types/context.types'
import { getProgressBar } from '@/utils/bot.utils'
import { MiddlewareFn } from 'telegraf'

export const broadcastCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const [command, ...text] = ctx.message.text.split(' ')
  console.log('Broadcast command received:', command, text.join(' '))

  const messageText = text.join(' ').trim()

  if (!messageText) {
    ctx.reply('❗️ Please provide a message to broadcast.')
    return next() // to logger middleware
  }

  console.log('Broadcasting message:', messageText)

  const msg = await ctx.reply(
    `📢 Broadcasting message: "${messageText}"\n\n` +
      'This may take a while, please be patient...'
  )

  broadcastMessage(messageText, (completd, total, failed) => {
    const percentage = Math.round((completd / total) * 100)
    const progressText = getProgressBar(percentage)

    console.log(progressText)
    console.log(
      `Broadcast progress: ${completd}/${total} (${percentage}%) - Failed: ${failed}`
    )

    ctx.telegram.editMessageText(
      ctx.chat.id,
      msg.message_id,
      undefined,
      `📢 Broadcasting message: "${messageText}"\n\n` +
        `Progress: ${progressText} (${completd}/${total})\n` +
        `Failed: ${failed}`
    )
  })
}
