import ProductModel from '@/models/product.model'
import UserModel from '@/models/user.model'
import { CommandContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const statsCommand: MiddlewareFn<CommandContext> = async (ctx, next) => {
  const totalUsers = await UserModel.countDocuments()
  const totalTracked = await ProductModel.countDocuments()

  await ctx.reply(
    [
      `<b>📊 Bot Statistics</b>`,
      `Total Users: <b>${totalUsers}</b>`,
      `Total Tracked Products: <b>${totalTracked}</b>`
    ].join('\n'),
    {
      parse_mode: 'HTML'
    }
  )

  await next()
}
