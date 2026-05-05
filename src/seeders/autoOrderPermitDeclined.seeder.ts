import env from '@/env'
import UserModel from '@/models/user.model'
import mongoose from 'mongoose'

export const autoOrderPermitDeclinedSeeder = async () => {
  await mongoose.connect(env.MONGO_URI)

  const result = await UserModel.updateMany(
    {},
    {
      $set: {
        'orderSettings.permitted': false,
        'orderSettings.enabled': false,
        'orderSettings.skus': []
      }
    }
  )

  console.log('Auto-order permit declined defaults seeded successfully')
  return result
}
