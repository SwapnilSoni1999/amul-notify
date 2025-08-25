import ActivityModel from '@/models/activity.model'
import { MyContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'
import dayjs from '@/libs/dayjs.lib'
import { TIMEZONE } from '@/config'
import { logToChannel } from '@/utils/logger.util'

export const analyticsMiddleware: MiddlewareFn<MyContext> = async (
  ctx,
  next
) => {
  const user = ctx.user

  if (!user) {
    return next()
  }

  const today = dayjs().tz(TIMEZONE)

  const dayKey = today.format('DD-MM-YYYY')

  await ActivityModel.updateOne(
    {
      userId: user._id,
      dayKey
    },
    {
      $setOnInsert: {
        userId: user.id,
        day: today.toDate(),
        dayKey
      }
    },
    { upsert: true }
  ).catch((err) => {
    logToChannel(`Error updating activity for user ${user.id}: ${err.message}`)
  })

  return next()
}
