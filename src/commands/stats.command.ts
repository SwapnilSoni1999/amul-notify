import { substoreSessions } from '@/libs/amulApi.lib'
import ProductModel from '@/models/product.model'
import UserModel from '@/models/user.model'
import {
  getDistinctPincodes,
  getDistinctSubstores
} from '@/services/user.service'
import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'

export const statsCommand: MiddlewareFn<CommandContext> = async (ctx, next) => {
  const totalUsers = await UserModel.countDocuments()
  const totalTracked = await ProductModel.countDocuments()

  const totalAmulSessions = substoreSessions.size
  const distinctSubstores = await getDistinctSubstores()
  const distinctPincodes = await getDistinctPincodes()

  await ctx.reply(
    [
      `<b>${emojis.chart} Bot Statistics</b>`,
      `Total Users: <b>${totalUsers}</b>`,
      `Total Tracked Products: <b>${totalTracked}</b>`,
      `Total Amul Sessions: <b>${totalAmulSessions}</b>`,
      `Total Unique Substores: <b>${distinctSubstores.length}</b>`,
      `Total Unique Pincodes: <b>${distinctPincodes.length}</b>`
    ].join('\n'),
    {
      parse_mode: 'HTML'
    }
  )

  await next()
}
