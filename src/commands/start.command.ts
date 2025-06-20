import { trackProduct, untrackProduct } from '@/services/track.service'
import { CommandContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const startCommand: MiddlewareFn<CommandContext> = async (ctx, next) => {
  const payload = ctx.payload
  if (payload.startsWith('track_')) {
    await ctx.deleteMessage()
    const [, ...sku] = payload.split('_')
    await trackProduct(ctx, sku.join('_'))
    return next()
  }
  if (payload.startsWith('untrack_')) {
    await ctx.deleteMessage()
    const [, ...sku] = payload.split('_')
    await untrackProduct(ctx, sku.join('_'))
    return next()
  }

  await ctx.reply(`🛒 <b>Welcome to the Amul Stock Bot!</b>`, {
    parse_mode: 'HTML'
  })

  await ctx.reply(
    `You can check availability of <b>Amul protein products</b> across stores.\n` +
      `✅ Type <b>/check</b> to get started\n` +
      `ℹ️ Type <b>/help</b> for more options`,
    {
      parse_mode: 'HTML'
    }
  )

  next()
}
