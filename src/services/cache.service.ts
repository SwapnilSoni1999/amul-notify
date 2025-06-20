import redis from '@/redis'
import { AmulProduct, AmulProductsResponse } from '@/types/amul.types'

const products = {
  set: async (value: AmulProductsResponse) => {
    await redis.set(
      'amul:products',
      JSON.stringify(value),
      'EX',
      60
      // Cache for 60 seconds
    )
  },
  get: async (): Promise<AmulProductsResponse | null> => {
    const cachedData = await redis.get('amul:products')
    return cachedData ? JSON.parse(cachedData) : null
  }
}

const jobData = {
  set: async (value: AmulProduct[]) => {
    return await redis.set(
      'job:amul:products',
      JSON.stringify(value),
      'EX',
      15 * 60 // Cache for 15 minutes
    )
  },
  get: async (): Promise<AmulProduct[] | null> => {
    const cachedData = await redis.get('job:amul:products')
    return cachedData ? JSON.parse(cachedData) : null
  },
  delete: async () => {
    await redis.del('job:amul:products')
  }
}

export default {
  products,
  jobData
}
