import env from '@/env'
import UserModel from '@/models/user.model'
import mongoose from 'mongoose'

export const autoOrderPermitGrantedSeeder = async () => {
  await mongoose.connect(env.MONGO_URI)

  const result = await UserModel.updateMany(
    {},
    {
      $set: {
        'orderSettings.permitted': true
      }
    }
  )

  console.log('Auto-order permit granted defaults seeded successfully')
  return result
}
