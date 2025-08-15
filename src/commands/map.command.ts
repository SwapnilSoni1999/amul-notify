import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'
import { inlineKeyboard } from 'telegraf/markup'

export const mapCommand: MiddlewareFn<CommandContext> = async (ctx, next) => {
  const mapUrl = 'https://amul.10xdev.me/map'
  const message: string = [
    `<b>${emojis.map} Interactive Map</b>`,
    '',
    `There's an interactive map of all the users in the bot. You can check various pincodes and it will show you the number of users from that pincode!`,
    ``,
    `<b>How to use it?</b>`,
    `- Open the map from button below.`,
    `- Enter the pincode you want to check.`,
    `- Click on the highlighted area to see the number of users from that pincode.`
  ].join('\n')

  const buttons = inlineKeyboard([
    [
      {
        text: 'Open Map',
        url: mapUrl
      }
    ]
  ])

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: buttons.reply_markup
  })
  await next()
}
