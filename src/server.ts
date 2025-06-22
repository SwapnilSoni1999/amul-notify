import mongoose from 'mongoose'
import env from '@/env'
import bot from '@/bot'
import redis from '@/redis'
import { stockCheckerJob } from './jobs/checker.job'
import { initiateAmulSessions } from './services/amul.service'
import { loadProxies } from './services/proxy.service'

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

    initiateAmulSessions()
    if (env.PROXY_ENABLED) {
      loadProxies()
    }

    bot
      .launch(() => {
        console.log('Bot is running...')

        // Start job
        if (env.TRACKER_ENABLED) {
          console.log('Starting stock checker job...')
          stockCheckerJob.start()
          stockCheckerJob.execute()
          console.log('Stock checker job started')
        } else {
          console.log('Stock tracker is disabled. Skipping job execution.')
        }
      })
      .catch((err) => {
        console.error('Failed to launch bot:', err)
      })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err)
    process.exit(1) // Exit the process if MongoDB connection fails
  })
