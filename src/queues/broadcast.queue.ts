import bot from '@/bot'
import env from '@/env'
import UserModel from '@/models/user.model'
import { emojis } from '@/utils/emoji.util'
import Bull from 'bull'
import { TelegramError } from 'telegraf'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'
import { setServers, getServers } from 'dns'
import ProductModel from '@/models/product.model'
import { logToChannel } from '@/utils/logger.util'
import {
  createSendMessageOperationId,
  getSendMessageJobId
} from './broadcastJobId.util'

interface BroadcastJobData {
  chatId: string | number
  text: string
  extra?: ExtraReplyMessage
  operationId: string
}

interface SendMessageQueuePayload extends Omit<
  BroadcastJobData,
  'operationId'
> {
  chatId: number
  operationId?: string
  onComplete?: (error?: Error | TelegramError) => void | Promise<void>
}

interface PendingJobHandler {
  resolve: () => void
  onComplete?: SendMessageQueuePayload['onComplete']
}

setServers(['8.8.8.8', '1.1.1.1'] as const)
console.log(`Using DNS servers: ${getServers()}`)

const pendingJobHandlers = new Map<string, PendingJobHandler[]>()

const broadcastQueue = new Bull<BroadcastJobData>('broadcast', {
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

const getJobHandlerKey = (jobId: Bull.JobId): string => {
  return String(jobId)
}

const addPendingJobHandler = (
  jobId: Bull.JobId,
  handler: PendingJobHandler
): void => {
  const key = getJobHandlerKey(jobId)
  const handlers = pendingJobHandlers.get(key) ?? []
  handlers.push(handler)
  pendingJobHandlers.set(key, handlers)
}

const removePendingJobHandler = (
  jobId: Bull.JobId,
  handler: PendingJobHandler
): void => {
  const key = getJobHandlerKey(jobId)
  const handlers = pendingJobHandlers.get(key)
  if (!handlers) {
    return
  }

  const remainingHandlers = handlers.filter((item) => item !== handler)
  if (remainingHandlers.length) {
    pendingJobHandlers.set(key, remainingHandlers)
  } else {
    pendingJobHandlers.delete(key)
  }
}

const runCompletionCallback = (
  handler: PendingJobHandler,
  error?: Error | TelegramError
): void => {
  try {
    Promise.resolve(handler.onComplete?.(error)).catch((err) => {
      console.error('Error in send-message completion callback:', err)
    })
  } catch (err) {
    console.error('Error in send-message completion callback:', err)
  }
}

const settlePendingJob = (
  jobId: Bull.JobId,
  error?: Error | TelegramError
): void => {
  const key = getJobHandlerKey(jobId)
  const handlers = pendingJobHandlers.get(key)
  if (!handlers) {
    return
  }

  pendingJobHandlers.delete(key)

  for (const handler of handlers) {
    runCompletionCallback(handler, error)
    handler.resolve()
  }
}

broadcastQueue.on('completed', (job) => {
  settlePendingJob(job.id)
})

broadcastQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error)
  settlePendingJob(job.id, error)
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
      if (error.code === 403) {
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
      }
      console.error(
        `[tgError][${error.name}] ${chatId}: ${error.message} - ${error.description}`
      )
      logToChannel(
        `[tgError][${error.name}] ${chatId}: ${error.message} - ${error.description}`
      )
    }
    console.error(
      `[broadcast.queue:60] Failed to send message to ${chatId}: ${error.message}`
    )

    throw error // Re-throw the error to mark the job as failed
  }
})

export const sendMessageQueue = async (
  payload: SendMessageQueuePayload
): Promise<void> => {
  // console.log('Args:', payload, onComplete)
  const operationId = payload.operationId ?? createSendMessageOperationId()
  // Keep completion handlers scoped to a specific send operation, not just the target chat.
  const jobId = getSendMessageJobId(payload.chatId, operationId)

  return new Promise<void>((resolve, reject) => {
    const handler: PendingJobHandler = {
      resolve,
      onComplete: payload.onComplete
    }

    addPendingJobHandler(jobId, handler)

    broadcastQueue
      .add(
        {
          chatId: payload.chatId,
          text: payload.text,
          extra: payload.extra,
          operationId
        },
        {
          jobId
        }
      )
      .catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        removePendingJobHandler(jobId, handler)
        console.error(`Failed to add broadcast job:`, error)
        runCompletionCallback(handler, error)
        reject(error)
      })
  })
}
