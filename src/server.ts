import mongoose from 'mongoose'
import env from '@/env'
import bot from '@/bot'
import redis from '@/redis'
import { stockCheckerJob } from './jobs/checker.job'
import cacheService from './services/cache.service'

redis.on('connect', () => {
  console.log('Connected to Redis successfully')
})
redis.on('error', (err) => {
  console.error('Failed to connect to Redis:', err)
})

mongoose
  .connect(env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully')

    bot
      .launch(() => {
        console.log('Bot is running...')

        // Start job
        cacheService.jobData.delete() // Clear previous job data
        stockCheckerJob.start()
        stockCheckerJob.execute()
        console.log('Stock checker job started')
      })
      .catch((err) => {
        console.error('Failed to launch bot:', err)
      })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err)
    process.exit(1) // Exit the process if MongoDB connection fails
  })
