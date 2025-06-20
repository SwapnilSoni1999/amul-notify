import { Redis } from 'ioredis'
import env from '@/env'

const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DATABASE_INDEX
})

export default redis
