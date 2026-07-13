import redis from '@/redis'
import { AmulProduct, AmulProductsResponse } from '@/types/amul.types'

interface SubstoreCacheKeyData {
  substore: string
}

interface ProductsCacheKeyData extends SubstoreCacheKeyData {
  category: string
}

interface SetCommandsCacheKeyData {
  tgId: number | string
}

const getProductsKey = (keyData: ProductsCacheKeyData) => {
  return `amul:products:${keyData.substore}:category:${encodeURIComponent(
    keyData.category
  )}`
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
  delete: async (keyData: SubstoreCacheKeyData) => {
    const baseKey = `amul:products:${keyData.substore}`
    const keys = [baseKey]
    let cursor = '0'

    do {
      const [nextCursor, productKeys] = await redis.scan(
        cursor,
        'MATCH',
        `${baseKey}:category*`,
        'COUNT',
        100
      )

      cursor = nextCursor
      keys.push(...productKeys)
    } while (cursor !== '0')

    await redis.del(...keys)
  }
}

const jobData = {
  set: async (keyData: SubstoreCacheKeyData, value: AmulProduct[]) => {
    const key = `amul:jobdata:${keyData.substore}`
    return await redis.set(
      key,
      JSON.stringify(value),
      'EX',
      5 * 60 // Cache for 5 minutes
    )
  },
  get: async (keyData: SubstoreCacheKeyData): Promise<AmulProduct[] | null> => {
    const key = `amul:jobdata:${keyData.substore}`
    const cachedData = await redis.get(key)
    return cachedData ? JSON.parse(cachedData) : null
  },
  delete: async (keyData: SubstoreCacheKeyData) => {
    await redis.del(`amul:jobdata:${keyData.substore}`)
  }
}

const setCommandsData = {
  set: async (keyData: SetCommandsCacheKeyData, value: boolean) => {
    const key = `amul:setcommands:${keyData.tgId}`
    return await redis.set(
      key,
      JSON.stringify(value),
      'EX',
      24 * 60 * 60 // Cache for 24 hours
    )
  },
  get: async (keyData: SetCommandsCacheKeyData): Promise<boolean> => {
    const key = `amul:setcommands:${keyData.tgId}`
    const cachedData = await redis.get(key)
    return cachedData ? JSON.parse(cachedData) : false
  },
  delete: async (keyData: SetCommandsCacheKeyData) => {
    await redis.del(`amul:setcommands:${keyData.tgId}`)
  }
}

export default {
  products,
  jobData,
  setCommandsData
}
