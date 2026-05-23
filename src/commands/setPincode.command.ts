import { AmulApi, getOrCreateAmulApi } from '@/libs/amulApi.lib'
import { AmulError } from '@/libs/amulError.lib'
import cacheService from '@/services/cache.service'
import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'

export const setPincodeCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const pincode = ctx.payload
  if (!pincode) {
    return ctx.reply(
      `${emojis.warning} Please provide a pincode after the command, e.g., /setpincode 123456`
    )
  }

  // Regex to validate Indian pincode format
  const pincodeRegex = /^[1-9][0-9]{5}$/
  if (!pincodeRegex.test(pincode)) {
    return ctx.reply(
      `${emojis.warning} Invalid pincode format. Please enter a valid 6-digit Indian pincode.`
    )
  }

  console.log(`Received pincode from user ${ctx.user.tgId}: ${pincode}`)
  const msg = await ctx.reply(
    `${emojis.refresh} Setting pincode to <b>${pincode}</b>...`,
    {
      parse_mode: 'HTML'
    }
  )

  const amulApi = await getOrCreateAmulApi(pincode).catch((err) => {
    console.error('Error creating Amul API instance:', err)

    if (err instanceof AmulError) {
      throw err // Let the global error handler deal with AmulErrors
    }

    return ctx.reply(
      `${emojis.exclamation} Failed to set pincode. Please try again later or contact /support.\n` +
        `Error: ${err.message}` // Provide error details for debugging
    )
  })

  await ctx.deleteMessage(msg.message_id).catch((err) => {
    console.error('Error deleting message:', err)
  })

  // console.log('Amul API instance:', amulApi)

  if (amulApi instanceof AmulApi) {
    const previousSubstore = ctx.user.substore
    const nextSubstore = amulApi.getSubstore()

    console.log(
      `Setting pincode for user ${
        ctx.user.tgId
      } to ${pincode} with substore: ${nextSubstore}`
    )
    ctx.user.set('pincode', pincode)
    ctx.user.set('substore', nextSubstore)
    await ctx.user.save()

    const substoresToClear = new Set(
      [previousSubstore, nextSubstore].filter((substore): substore is string =>
        Boolean(substore)
      )
    )

    await Promise.all(
      [...substoresToClear].map((substore) =>
        cacheService.products.delete({ substore })
      )
    )

    return ctx.reply(
      `${emojis.checkMark} Pincode set successfully to ${ctx.user.pincode}.\n` +
        `Substore: ${ctx.user.substore}\n` +
        `You can now use the bot to track products in your area.`
    )
  }

  ctx.reply(
    `${emojis.warning} Failed to set pincode. Please try again later or contact /support.`
  )
  return next()
}
