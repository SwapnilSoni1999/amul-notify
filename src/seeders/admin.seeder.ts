import UserModel, { IUser } from '@/models/user.model'

export const adminSeeder = async () => {
  const users: Omit<IUser, 'createdAt' | 'updatedAt'>[] = [
    {
      firstName: 'SoniSins',
      lastName: '',
      isAdmin: true,
      isBlocked: false,
      tgId: 317890515,
      tgUsername: 'SoniSins'
    }
  ]

  await UserModel.deleteMany({ isAdmin: true })
  await UserModel.insertMany(users)
  console.log('Admin user seeded successfully')
  return users
}
