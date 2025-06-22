import bot from '@/bot'
import env from '@/env'
import Bull from 'bull'
import { TelegramError } from 'telegraf'

const broadcastQueue = new Bull<{
  chatId: string
  text: string
}>('broadcast', {
  // 30 messages per second
  limiter: {
    max: 15, // for safety, but effectively 30 per second
    duration: 2000 // 2 seconds
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    db: env.REDIS_DATABASE_INDEX
  }
})

broadcastQueue.process(async (job, done) => {
  const { chatId, text } = job.data
  console.log(`Job data:`, job.data)

  try {
    // Simulate sending message
    console.log(`Sending message to ${chatId}: ${text}`)

    // Here you would use your bot's sendMessage method

    await bot.telegram
      .sendMessage(chatId, text, {
        parse_mode: 'HTML',
        link_preview_options: {
          is_disabled: true
        }
      })
      .catch((err) => {
        if (err instanceof TelegramError) {
          console.log({
            ...err
          })
        }
      })

    done()
  } catch (error: any) {
    console.error(`Failed to send message to ${chatId}:`, error)
    done(new Error(`Failed to send message to ${chatId}`))
  }
})

export const sendMessageQueue = async (payload: {
  chatId: number
  text: string
  onComplete: (error?: Error) => void
}) => {
  // console.log('Args:', payload, onComplete)
  const job = await broadcastQueue.add(
    {
      chatId: String(payload.chatId),
      text: payload.text
    },
    {
      attempts: 1, // Retry up to 1 time if it fails
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
