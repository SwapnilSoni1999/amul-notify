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

  await ctx.reply(
    `👋 <b>Welcome to Amul Stock Notification Bot!</b>\n\n` +
      `I help you track availability of Amul's protein products, including shakes, lassi, paneer and more.\n\n` +
      `Here’s what I can do:\n` +
      `• <b>/products</b> – List all protein products\n` +
      `• <b>/tracked</b> – Show products you're tracking\n\n` +
      `Get started by typing <b>/products</b> or simply explore available stock.`,
    { parse_mode: 'HTML' }
  )

  next()
}
