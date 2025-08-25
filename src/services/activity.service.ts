import { TIMEZONE } from '@/config'
import dayjs from '@/libs/dayjs.lib'
import ActivityModel from '@/models/activity.model'

export const getTodayActiveCount = async () => {
  const dayKey = dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
  return ActivityModel.countDocuments({ dayKey })
}
