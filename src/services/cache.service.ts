import redis from '@/redis'
import { AmulProduct, AmulProductsResponse } from '@/types/amul.types'

interface ProductsCacheKeyData {
  substore: string
}

const products = {
  set: async (keyData: ProductsCacheKeyData, value: AmulProductsResponse) => {
    const key = `amul:products:${keyData.substore}`
    await redis.set(
      key,
      JSON.stringify(value),
      'EX',
      5 * 60 // Cache for 5 minutes
      // Cache for 60 seconds
    )
  },
  get: async (
    keyData: ProductsCacheKeyData
  ): Promise<AmulProductsResponse | null> => {
    const key = `amul:products:${keyData.substore}`
    const cachedData = await redis.get(key)
    return cachedData ? JSON.parse(cachedData) : null
  }
}

const jobData = {
  set: async (keyData: ProductsCacheKeyData, value: AmulProduct[]) => {
    const key = `amul:jobdata:${keyData.substore}`
    return await redis.set(
      key,
      JSON.stringify(value),
      'EX',
      15 * 60 // Cache for 15 minutes
    )
  },
  get: async (keyData: ProductsCacheKeyData): Promise<AmulProduct[] | null> => {
    const key = `amul:jobdata:${keyData.substore}`
    const cachedData = await redis.get(key)
    return cachedData ? JSON.parse(cachedData) : null
  },
  delete: async (keyData: ProductsCacheKeyData) => {
    await redis.del(`amul:jobdata:${keyData.substore}`)
  }
}

export default {
  products,
  jobData
}
