import { toggleAutoOrder } from '@/services/autoOrder.service'
import {
  toggleFavouriteProduct,
  trackProduct,
  untrackProduct
} from '@/services/track.service'
import { CommandContext } from '@/types/context.types'
import { isAutoOrderConfigured } from '@/utils/autoOrder.util'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'

export const startCommand: MiddlewareFn<CommandContext> = async (ctx, next) => {
  const payload = ctx.payload || ''
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
  if (payload.startsWith('fav_')) {
    await ctx.deleteMessage()
    const [, ...sku] = payload.split('_')
    await toggleFavouriteProduct(ctx, sku.join('_'))
    return next()
  }

  if (new RegExp(/(add|remove)autoorder_/).test(payload)) {
    await ctx.deleteMessage()
    const [actionString, ...sku] = payload.split('_')
    const action = actionString.replace('autoorder', '').toLowerCase() as
      | 'add'
      | 'remove'
    await toggleAutoOrder(ctx, sku.join('_'), action)
    return next()
  }

  const welcomeMessages = [
    `${emojis.wave} <b>Welcome to Amul Stock Notification Bot!</b>`,
    ``,
    ctx.user && ctx.user.pincode?.length && ctx.user.substore?.length
      ? `Your Current Pincode: <b>${ctx.user.pincode} (${ctx.user.substore})</b>`
      : null,
    `I help you track availability of Amul products by category, including protein products, chocolates, ghee and more.`,
    ``,
    `Here’s what I can do:`,
    `• <b>/setpincode</b> – Set your pincode to get local stock updates`,
    `• <b>/products</b> – Browse products by category`,
    `          OR`,
    `• <b>/products &lt;search_query&gt;</b> – Search for a specific product by name`,
    `<i>Tip: Hold the command from the menu to instantly add the command.</i>`,
    `• <b>/tracked</b> – Show products you're tracking`,
    ``,
    `• <b>/favourites</b> – Show your favourite products`,
    `• <b>/settings</b> – View or change your settings for notifications`,
    `• <b>/support</b> – Support the bot and contact the developer`,
    `• <b>/map</b> – View interactive map of users`,
    isAutoOrderConfigured()
      ? `• ${emojis.star} <b>/autoorder</b> – Get started with auto-ordering your favourite products (limited beta)`
      : null,
    ``,
    `Get started by typing <b>/products</b> or simply explore available stock.`,
    '',
    `Updates Channel: <a href="https://t.me/AmulOSSBotUpdates">@AmulOSSBotUpdates</a>`,
    `Group Chat: <a href="https://t.me/AmulOSSBotGroup">@AmulOSSBotGroup</a>`
  ]

  await ctx.reply(welcomeMessages.join('\n'), { parse_mode: 'HTML' })

  next()
}
