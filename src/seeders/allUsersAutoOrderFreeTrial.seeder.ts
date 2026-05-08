import env from '@/env'
import PaymentModel from '@/models/payment.model'
import UserModel, { HydratedUser } from '@/models/user.model'
import { grantAutoBookingFreeTrial } from '@/services/payment.service'
import mongoose from 'mongoose'
import ms from 'ms'

const FREE_TRIAL_DURATION = '15d'
const FREE_TRIAL_SOURCE = 'free_trial_all_users_15d'

const buildSeederReferenceId = (user: HydratedUser): string => {
  return `ab_trial_all_users_15d_${user._id.toString()}`
}

export const allUsersAutoOrderFreeTrialSeeder = async () => {
  await mongoose.connect(env.MONGO_URI)

  const durationMs = ms(FREE_TRIAL_DURATION as ms.StringValue)
  let totalCount = 0
  let grantedCount = 0
  let skippedCount = 0

  for await (const user of UserModel.find().cursor()) {
    totalCount++

    const referenceId = buildSeederReferenceId(user)
    const alreadyGranted = await PaymentModel.exists({ referenceId })

    if (alreadyGranted) {
      skippedCount++
      continue
    }

    await grantAutoBookingFreeTrial(user, durationMs, {
      referenceId,
      source: FREE_TRIAL_SOURCE
    })

    grantedCount++
  }

  const result = {
    totalCount,
    grantedCount,
    skippedCount,
    duration: FREE_TRIAL_DURATION
  }

  console.log('All-users auto-order free trial seeded successfully:', result)
  return result
}
