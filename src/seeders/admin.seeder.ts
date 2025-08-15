import env from '@/env'
import UserModel, { IUser } from '@/models/user.model'
import mongoose from 'mongoose'

export const adminSeeder = async () => {
  await mongoose.connect(env.MONGO_URI)
  const users: Omit<IUser, 'createdAt' | 'updatedAt'>[] = [
    {
      firstName: 'SoniSins',
      lastName: '',
      isAdmin: true,
      isBlocked: false,
      tgId: 317890515,
      tgUsername: 'SoniSins',
      settings: {
        trackingStyle: 'once',
        maxNotifyCount: 1
      },
      favSkus: []
    }
  ]

  await UserModel.deleteMany({ isAdmin: true })
  await UserModel.insertMany(users)
  console.log('Admin user seeded successfully')
  return users
}
