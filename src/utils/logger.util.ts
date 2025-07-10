import { LOG_CHANNEL } from '@/config'
import { sendMessageQueue } from '@/queues/broadcast.queue'
import { TelegramError } from 'telegraf'

export const logToChannel = async (text: string, next?: () => void) => {
  try {
    sendMessageQueue({
      chatId: LOG_CHANNEL,
      text,
      extra: {
        parse_mode: 'HTML'
      },
      onComplete: (error?: Error) => {
        if (error) {
          console.error('Error sending log message:', error)
          if (error instanceof TelegramError) {
            if (error.code === 429) {
              if (error.parameters?.retry_after) {
                console.error(
                  `Rate limit exceeded. Retrying after ${error.parameters.retry_after} seconds.`
                )
                setTimeout(
                  () => logToChannel(text, next),
                  error.parameters.retry_after * 1000
                )
              }
            }
          }
        } else {
          console.log('Log message sent successfully:', text)
        }
      }
    })

    next?.()
  } catch (err) {
    console.error('Error in logToChannel:', err)
    logToChannel(
      `Error in logToChannel: ${
        err instanceof Error ? err.message : String(err)
      }`,
      next
    )
  }
}
