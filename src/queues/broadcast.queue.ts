import bot from '@/bot'
import env from '@/env'
import UserModel from '@/models/user.model'
import { emojis } from '@/utils/emoji.util'
import Bull from 'bull'
import { TelegramError } from 'telegraf'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'
import { setServers, getServers } from 'dns'
import ProductModel from '@/models/product.model'

setServers(['8.8.8.8', '1.1.1.1'] as const)
console.log(`Using DNS servers: ${getServers()}`)

const broadcastQueue = new Bull<{
  chatId: string | number
  text: string
  extra?: ExtraReplyMessage
}>('broadcast', {
  // 30 messages per second
  defaultJobOptions: {
    attempts: 1, // Retry once if it fails
    removeOnComplete: true, // Remove job from queue after completion
    removeOnFail: true // Remove job from queue after failure
  },
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
      .catch(async (err) => {
        console.log('[ATTENTION:] ERROR:', err)
        console.log(JSON.stringify(err))
        if (err instanceof TelegramError) {
          if (err.code === 403) {
            // User has blocked the bot or left the chat
            console.warn(
              `User ${chatId} has blocked the bot or left the chat. Removing from database.`
            )
            console.log(
              `[catchFn](broadcast.queue): Removing user ${chatId} from database due to TelegramError`
            )
            const deleteResponse = await UserModel.findOneAndDelete({
              tgId: Number(chatId)
            })
            if (deleteResponse?._id) {
              await ProductModel.deleteMany({ trackedBy: deleteResponse._id })
            }
            console.log(
              `User ${chatId} removed from database. Deleted count: ${JSON.stringify(
                deleteResponse
              )}` // Log the number of deleted users
            )
          } else {
            console.error(
              `Telegram error for user ${chatId}: ${err.description}`
            )
          }
        }

        if (err.toString().includes('bot was blocked by the user')) {
          console.warn(
            `User ${chatId} has blocked the bot. Removing from database.`
          )
          console.log(
            `[catchFn](broadcast.queue): Removing user ${chatId} from database due to bot being blocked`
          )
          const deleteResponse = await UserModel.findOneAndDelete({
            tgId: Number(chatId)
          })
          if (deleteResponse?._id) {
            await ProductModel.deleteMany({ trackedBy: deleteResponse._id })
          }
          console.log(
            `User ${chatId} removed from database. Deleted count: ${JSON.stringify(
              deleteResponse
            )}` // Log the number of deleted users
          )
        }

        console.error(
          `${emojis.crossMark} Failed to send message to ${chatId}: ${err.message}`
        )
        throw err
      })

    return
  } catch (error: any) {
    console.error(`Failed to send message to ${chatId}:`, error)
    if (error instanceof TelegramError) {
      console.log(
        `[catch](broadcast.queue): Removing user ${chatId} from database due to TelegramError`
      )
      const deleteResponse = await UserModel.findOneAndDelete({
        tgId: Number(chatId)
      })
      if (deleteResponse?._id) {
        await ProductModel.deleteMany({ trackedBy: deleteResponse._id })
      }
      console.log(
        `User ${chatId} removed from database. Deleted count: ${JSON.stringify(
          deleteResponse
        )}` // Log the number of deleted users
      )
      console.error(
        `[tgError][${error.name}] ${chatId}: ${error.message} -> ${error.description}`
      )
    }
    console.error(
      `[broadcast.queue:60] Failed to send message to ${chatId}: ${error.message}`
    )

    throw error // Re-throw the error to mark the job as failed
  }
})

export const sendMessageQueue = async (payload: {
  chatId: number
  text: string
  extra?: ExtraReplyMessage
  onComplete: (error?: Error | TelegramError) => void
}) => {
  // console.log('Args:', payload, onComplete)
  const job = await broadcastQueue.add(
    {
      chatId: payload.chatId,
      text: payload.text,
      extra: payload.extra
    },
    {
      jobId: String(payload.chatId) // Use chatId as job ID to avoid duplicates
    }
  )

  try {
    await job.finished()
    payload.onComplete()
  } catch (err) {
    console.error(`Job failed:`, err)
    payload.onComplete(err as Error | TelegramError)
  }
}
