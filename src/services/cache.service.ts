import redis from '@/redis'
import { AmulProductsResponse } from '@/types/amul.types'

const products = {
  set: (value: AmulProductsResponse) => {
    redis.set(
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

export default {
  products
}
