import UserModel from '@/models/user.model'
import { CommandContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const amulSessionsCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const message: string[] = []

  const substoresWithCount = await UserModel.aggregate<{
    _id: string
    count: number
  }>([
    {
      $match: {
        substore: {
          $exists: true,
          $ne: null
        }
      }
    },
    {
      $group: {
        _id: '$substore',
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        count: -1
      }
    }
  ])

  for (const substore of substoresWithCount) {
    message.push(`${substore._id} <b>(${substore.count})</b>`)
  }

  ctx.reply(
    message.length
      ? `📊 Active sessions:\n${message.join('\n')}`
      : '❗️ No active sessions found.',
    {
      parse_mode: 'HTML',
      link_preview_options: {
        is_disabled: true
      }
    }
  )

  return next()
}
