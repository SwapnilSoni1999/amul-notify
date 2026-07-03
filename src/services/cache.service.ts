import redis from '@/redis'
import { AmulProduct, AmulProductsResponse } from '@/types/amul.types'

interface ProductsCacheKeyData {
  substore: string
  categories?: readonly string[]
}

const getProductsKey = (keyData: ProductsCacheKeyData) => {
  if (!keyData.categories?.length) {
    return `amul:products:${keyData.substore}`
  }

  const categories = [...keyData.categories]
    .sort()
    .map((category) => encodeURIComponent(category))
    .join(',')

  return `amul:products:${keyData.substore}:categories:${categories}`
}

const products = {
  set: async (keyData: ProductsCacheKeyData, value: AmulProductsResponse) => {
    const key = getProductsKey(keyData)
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
    const key = getProductsKey(keyData)
    const cachedData = await redis.get(key)
    return cachedData ? JSON.parse(cachedData) : null
  },
  delete: async (keyData: ProductsCacheKeyData) => {
    const baseKey = getProductsKey({
      substore: keyData.substore
    })
    const keys = [baseKey]
    let cursor = '0'

    do {
      const [nextCursor, categoryKeys] = await redis.scan(
        cursor,
        'MATCH',
        `${baseKey}:categories:*`,
        'COUNT',
        100
      )

      cursor = nextCursor
      keys.push(...categoryKeys)
    } while (cursor !== '0')

    await redis.del(...keys)
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
