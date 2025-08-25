import bot from '@/bot'
import { TIMEZONE } from '@/config'
import UserModel from '@/models/user.model'
import { getTodayActiveCount } from '@/services/activity.service'
import { schedule } from 'node-cron'

const activityNotifierJob = schedule(
  '59 23 * * *',
  async () => {
    console.log('[Analytics] Notifying at 11:59 PM IST')

    const admins = await UserModel.find({
      isAdmin: true
    })

    const totalUsers = await UserModel.countDocuments()
    const todayActiveUsers = await getTodayActiveCount()
    const inactiveUsers = totalUsers - todayActiveUsers

    for (const admin of admins) {
      if (!admin.tgId) {
        continue
      }

      await bot.telegram
        .sendMessage(
          admin.tgId,
          [
            `<b>Bot Statistics</b>`,
            `Total Users: <b>${totalUsers}</b>`,
            `Total Active Users (Today): <b>${todayActiveUsers}</b>`,
            `Total Inactive Users: <b>${inactiveUsers}</b>`
          ].join('\n'),
          {
            parse_mode: 'HTML'
          }
        )
        .catch((err) => {
          console.error(
            `[Analytics] Failed to send message to admin ${admin.tgId}: ${err.message}`
          )
        })
    }

    console.log('[Analytics] Notified at 11:59 PM IST')
  },
  {
    timezone: TIMEZONE
  }
)

export { activityNotifierJob }
