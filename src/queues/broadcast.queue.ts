import bot from '@/bot'
import env from '@/env'
import { emojis } from '@/utils/emoji.util'
import Bull from 'bull'
import { TelegramError } from 'telegraf'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

const broadcastQueue = new Bull<{
  chatId: string
  text: string
  extra?: ExtraReplyMessage
}>('broadcast', {
  // 30 messages per second

  limiter: {
    max: 30,
    duration: 2000 // keeping it at 30 messages per 2 seconds
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    db: env.REDIS_DATABASE_INDEX
  }
})

broadcastQueue.process(5, async (job) => {
  const { chatId, text, extra } = job.data
  // console.log(`Job data:`, job.data)

  try {
    // Simulate sending message
    // console.log(`Sending message to ${chatId}: ${text}`)

    // Here you would use your bot's sendMessage method
    const defaultExtra: ExtraReplyMessage = {
      parse_mode: 'HTML',
      disable_notification: true // we don't want to spam users with notifications
    }

    Object.assign(defaultExtra, extra)

    await bot.telegram
      .sendMessage(chatId, text, defaultExtra)
      .then(() => {
        console.log(`${emojis.checkMark} Message sent to ${chatId}: ${text}`)
      })
      .catch((err) => {
        console.error(
          `${emojis.crossMark} Failed to send message to ${chatId}: ${err.message}`
        )
        throw err
      })

    return
  } catch (error: any) {
    console.error(`Failed to send message to ${chatId}:`, error)
    if (error instanceof TelegramError) {
      throw new Error(
        `[tgError][${error.name}] ${chatId}: ${error.message} -> ${error.description}`
      )
    }
    throw new Error(
      `[broadcast.queue:60] Failed to send message to ${chatId}: ${error.message}`
    )
  }
})

export const sendMessageQueue = async (payload: {
  chatId: number
  text: string
  extra?: ExtraReplyMessage
  onComplete: (error?: Error) => void
}) => {
  // console.log('Args:', payload, onComplete)
  const job = await broadcastQueue.add(
    {
      chatId: String(payload.chatId),
      text: payload.text,
      extra: payload.extra
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      jobId: String(payload.chatId), // Use chatId as job ID to avoid duplicates
      removeOnComplete: true // Remove job from queue after completion
    }
  )

  try {
    await job.finished()
    payload.onComplete()
  } catch (err) {
    console.error(`Job failed:`, err)
    payload.onComplete(err as Error)
  }
}
