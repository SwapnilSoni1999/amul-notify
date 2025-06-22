import { getOrCreateAmulApi } from '@/libs/amulApi.lib'
import UserModel, { IUser } from '@/models/user.model'
import { sleep } from '@/utils'
import { FilterQuery } from 'mongoose'

export const initiateAmulSessions = async () => {
  const PAGE_SIZE = 1000

  const query: FilterQuery<IUser> = {
    pincode: { $exists: true, $ne: null },
    substore: { $exists: true, $ne: null }
  }
  const totalUsers = await UserModel.countDocuments(query)
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE)

  for (let page = 0; page < totalPages; page++) {
    const users = await UserModel.find(query)
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select('pincode substore')
      .lean()

    for (const user of users) {
      try {
        await getOrCreateAmulApi(user.pincode)
        console.log(
          `Initiated session for user with pincode: ${user.pincode}, substore: ${user.substore}`
        )
        await sleep(30 * 1000) // Sleep for 30 seconds between each session initiation
      } catch (err) {
        console.error(
          `Failed to initiate session for user with pincode: ${user.pincode}, substore: ${user.substore}`,
          err
        )
      }
    }
  }
}
