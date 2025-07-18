import { MyContext } from '@/types/context.types'
import { logToChannel } from '@/utils/logger.util'
import { MiddlewareFn } from 'telegraf'

export const loggerMiddleware: MiddlewareFn<MyContext> = async (ctx) => {
  console.log(`Received update: ${JSON.stringify(ctx.update, null, 2)}`)

  try {
    logToChannel(
      [
        `ID: <code>${ctx.from?.id}</code>`,
        `User: ${ctx.from?.first_name} ${ctx.from?.last_name || ''} (@${
          ctx.from?.username
        })`,
        `Pincode: ${ctx.user.pincode || 'N/A'} (${ctx.user.substore || 'N/A'})`,
        `Text: ${
          ctx.message && 'text' in ctx.message ? ctx.message.text : 'N/A'
        }`,
        `Payload: ${
          'payload' in ctx
            ? ctx.payload
            : (ctx.callbackQuery && 'data' in ctx.callbackQuery
                ? ctx.callbackQuery.data
                : 'N/A') || 'N/A'
        }`
      ].join('\n')
    )
  } catch (error) {
    console.error('Error in middleware:', error)
  }
}
