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
    await redis.set(
      'amul:products:job',
      JSON.stringify(value),
      'EX',
      120
      // Cache for 120 seconds
    )
  },
  get: async (): Promise<AmulProduct[] | null> => {
    const cachedData = await redis.get('amul:products')
    return cachedData ? JSON.parse(cachedData) : null
  }
}

export default {
  products,
  jobData
}
