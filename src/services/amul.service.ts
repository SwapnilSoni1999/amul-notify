import {
  AmulApi,
  getOrCreateAmulApi,
  substoreSessions
} from '@/libs/amulApi.lib'
import { sleep } from '@/utils'
import { getDistinctPincodes } from './user.service'

export const initiateAmulSessions = async () => {
  const distinctPincodes = await getDistinctPincodes()

  for (const pincode of distinctPincodes) {
    try {
      await getOrCreateAmulApi(pincode)
      console.log(`Initiated session for pincode: ${pincode}`)
      await sleep(10 * 1000) // Sleep for 30 seconds between each session initiation
    } catch (err) {
      console.error(`Failed to initiate session for pincode: ${pincode}`, err)
    }
  }
}

export const getAmulApiFromSubstore = async (substore: string) => {
  let existingApi: AmulApi | undefined
  for (const [key, api] of substoreSessions.entries()) {
    if (key === substore) {
      existingApi = api
      break
    }
  }
  if (existingApi) {
    return existingApi
  }
}
