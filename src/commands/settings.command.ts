import { ACTIONS } from '@/config'
import { ActionContext, CommandContext, MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { withCatchAsync } from '@/utils/withCatchAsync.util'
import { MiddlewareFn } from 'telegraf'
import { inlineKeyboard } from 'telegraf/markup'
import {
  InlineKeyboardButton,
  Update
} from 'telegraf/typings/core/types/typegram'

export const settingsCommand: MiddlewareFn<
  CommandContext | ActionContext | MyContext<Update>
> = withCatchAsync(async (ctx, next?) => {
  const { trackingStyle = 'once' } = ctx.user.settings

  const btns: InlineKeyboardButton[][] = [
    [
      {
        text: `Tracking Condition: ${emojis[trackingStyle!]} ${trackingStyle}`,
        callback_data: ACTIONS.settings.trackingStyle.toggle
      }
    ]
  ]

  if (trackingStyle === 'always') {
    btns.push([
      {
        text: `${emojis.count} Max Notify Count: ${ctx.user.settings.maxNotifyCount}`,
        callback_data: ACTIONS.settings.trackingStyle.changeMaxNotifyCount
      }
    ])
  }

  const buttons = inlineKeyboard([...btns])

  const description = [
    `${emojis.settings} <b>Settings</b>`,
    '',
    `What is <b>Tracking Condition</b>?`,
    `- <b>Once</b>: Notify only once when a product is available. And then untrack it.`,
    '',
    `- <b>Always</b>: Notify every time a product is available. And keep tracking it. You can set a <b>Max Notify Count</b> to limit the number of notifications.`,
    `This will repeat each cycle until you untrack the product.`,
    `<i>Note: This setting is per product. Users might feel getting spammed due to this feature, So use it if you really want to.</i>`,
    '',
    `- <b>Max Notify Count</b>: The maximum number of notifications to send for a product when tracking is set to <b>Always</b>.`,
    ``,
    'Eg.',
    `An ideal way to use this feature is to set it to <b>always</b> and set a <b>Max Notify Count</b> to 1. This way, you will get notified once when the product is available, and <b>it will not untrack</b> the product. It will stay tracked, and next time when the product restocks, you will get notified again.`
  ].join('\n')

  if (ctx.callbackQuery?.message?.message_id) {
    await ctx.telegram.editMessageText(
      ctx.callbackQuery.message.chat.id,
      ctx.callbackQuery.message.message_id,
      undefined,
      description,
      {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      }
    )
    await ctx.answerCbQuery()
  } else {
    await ctx.reply(description, {
      parse_mode: 'HTML',
      reply_markup: buttons.reply_markup
    })
  }
  return next?.()
})
