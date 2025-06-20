import bot from '@/bot'
import { LOG_CHANNEL } from '@/config'

export const logToChannel = async (text: string, next?: () => void) => {
  try {
    bot.telegram
      .sendMessage(LOG_CHANNEL, text, {
        parse_mode: 'HTML'
      })
      .catch((err) => {
        console.error('Failed to send log message:', err)
      })
    console.log('Log message sent to channel:', text)
    next?.()
  } catch (err) {
    console.error('Error in logToChannel:', err)
  }
}
