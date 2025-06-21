import { CommandContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'
import { inlineKeyboard } from 'telegraf/typings/markup'

export const supportCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const keyboard = inlineKeyboard([
    [
      {
        text: `Give ⭐️ on GitHub`,
        url: `https://github.com/SwapnilSoni1999/amul-notify`
      },
      {
        text: `Contact Developer`,
        url: `https://t.me/SoniSins`
      }
    ],
    [
      {
        text: `💳 Donate via UPI`,
        url: `https://razorpay.me/@10xdev`
      }
    ]
  ])

  await ctx.reply(
    [
      `<b>Support the Bot</b>`,
      `If you find this bot useful, consider supporting its development! This bot is open-source and relies on community contributions to keep it running smoothly.`,
      `Your contributions help keep it running and improving.`,
      `Thank you for your support! 🙏`,
      ''
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    }
  )

  next()
}
