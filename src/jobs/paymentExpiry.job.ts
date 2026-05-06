import { TIMEZONE } from '@/config'
import PaymentModel from '@/models/payment.model'
import UserModel from '@/models/user.model'
import { sendMessageQueue } from '@/queues/broadcast.queue'
import {
  clearUserAutoBookingAccess,
  expirePayment,
  hasValidAutoBookingPayment
} from '@/services/payment.service'
import { emojis } from '@/utils/emoji.util'
import { logToChannel } from '@/utils/logger.util'
import { schedule } from 'node-cron'

const paymentExpiryJob = schedule(
  '0 0 * * *',
  async () => {
    try {
      const now = new Date()
      const expiredPayments = await PaymentModel.find({
        status: 'paid',
        validUntil: {
          $lte: now
        }
      })

      const userIds = new Set<string>()

      for (const payment of expiredPayments) {
        userIds.add(payment.user.toString())
        await expirePayment(payment)
      }

      for (const userId of userIds) {
        const hasValidPayment = await hasValidAutoBookingPayment(userId)
        if (hasValidPayment) {
          continue
        }

        const user = await UserModel.findById(userId)
        if (!user) {
          continue
        }

        await clearUserAutoBookingAccess(user)

        if (user.tgId) {
          await sendMessageQueue({
            chatId: user.tgId,
            text: [
              `${emojis.warning} <b>Auto-booking payment expired</b>`,
              `Your auto-booking access has expired, so your auto-booking products were cleared and your Amul session was logged out.`,
              ``,
              `To continue using auto-booking, please renew your payment from /autoorder.`
            ].join('\n')
          })
        }
      }

      if (expiredPayments.length) {
        logToChannel(
          `${emojis.info} Expired ${expiredPayments.length} auto-booking payment(s).`
        )
      }
    } catch (err) {
      console.error('Error in payment-expiry-job:', err)
      logToChannel(
        `${emojis.crossMark} Error in payment-expiry-job: ${
          err instanceof Error ? err.message : String(err)
        }`
      )
    }
  },
  {
    timezone: TIMEZONE,
    name: 'payment-expiry-job'
  }
)

export { paymentExpiryJob }
