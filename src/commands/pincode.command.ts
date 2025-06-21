import { CommandContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const pincodeCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  await ctx.reply(
    `Your current pincode is: <b>${ctx.user.pincode} (${ctx.user.substore})</b>\n\n` +
      `To change your pincode, use the command <b>/setpincode</b> followed by your new pincode.\n` +
      `Example: <b>/setpincode 123456</b>`,
    {
      parse_mode: 'HTML'
    }
  )
  return next()
}
