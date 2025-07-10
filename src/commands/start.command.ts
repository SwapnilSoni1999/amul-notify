import { trackProduct, untrackProduct, trackProductAlways, toggleTrackAlways } from '@/services/track.service'
import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
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
  if (payload.startsWith('trackalways_')) {
    await ctx.deleteMessage()
    const [, ...sku] = payload.split('_')
    await trackProductAlways(ctx, sku.join('_'))
    return next()
  }
  if (payload.startsWith('toggle_')) {
    await ctx.deleteMessage()
    const [, ...sku] = payload.split('_')
    await toggleTrackAlways(ctx, sku.join('_'))
    return next()
  }

  const welcomeMessages = [
    `${emojis.wave} <b>Welcome to Amul Stock Notification Bot!</b>`,
    ``,
    ctx.user && ctx.user.pincode?.length && ctx.user.substore?.length
      ? `Your Current Pincode: <b>${ctx.user.pincode} (${ctx.user.substore})</b>`
      : null,
    `I help you track availability of Amul's protein products, including shakes, lassi, paneer and more.`,
    ``,
    `Here's what I can do:`,
    `• <b>/setpincode</b> – Set your pincode to get local stock updates`,
    `• <b>/products</b> – List all protein products to track`,
    `          OR`,
    `• <b>/products &lt;search_query&gt;</b> – Search for a specific product by name`,
    `<i>Tip: Hold the command from the menu to instantly add the command.</i>`,
    `• <b>/tracked</b> – Show products you're tracking`,
    ``,
    `<b>🔍 Track Once:</b> Get notified when product is back in stock (auto-untracked after notification)`,
    `<b>🔁 Track Always:</b> Get notified every time product comes back in stock (persistent tracking)`,
    ``,
    `• <b>/support</b> – Support the bot and contact the developer`,
    `Get started by typing <b>/products</b> or simply explore available stock.`
  ]

  await ctx.reply(welcomeMessages.join('\n'), { parse_mode: 'HTML' })

  next()
}
