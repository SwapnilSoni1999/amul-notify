import mongoose from 'mongoose'
import env from '@/env'
import bot from '@/bot'
import redis from '@/redis'
import { stockCheckerJob } from './jobs/checker.job'
import { initiateAmulSessions } from './services/amul.service'
import app from '@/app'
import { activityNotifierJob } from './jobs/activityReport.job'

redis.on('connect', () => {
  console.log('Connected to Redis successfully')
})
redis.on('error', (err) => {
  console.error('Failed to connect to Redis:', err)
})

mongoose
  .connect(env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully')

    initiateAmulSessions()

    if (env.BOT_WEBHOOK_URL) {
      const botSecret = `amul_${bot.secretPathComponent()}`
      console.log(`Setting webhook to: ${env.BOT_WEBHOOK_URL}`)
      await bot.telegram.setWebhook(env.BOT_WEBHOOK_URL, {
        secret_token: botSecret
      })

      const url = new URL(env.BOT_WEBHOOK_URL)
      const hookPath = url.pathname.endsWith('/')
        ? url.pathname.slice(0, -1)
        : url.pathname

      app.use(hookPath, (req, res) => {
        // console.log('Bot Secret:', req.get('X-Telegram-Bot-Api-Secret-Token'))
        if (req.get('X-Telegram-Bot-Api-Secret-Token') !== botSecret) {
          console.error('Invalid secret token')
          return res.status(403).end()
        }

        bot.handleUpdate(req.body, res).catch((err) => {
          console.error('Error in bot.handleUpdate:', err)
          // Still respond 200 so Telegram won’t retry endlessly
          res.status(200).end()
        })
      })

      console.log('Bot is running with webhook mode...')
      console.log(await bot.telegram.getWebhookInfo())
    } else {
      bot
        .launch(() => {
          console.log('Bot is running...')
        })
        .catch((err) => {
          console.error('Failed to launch bot:', err)
        })
    }

    app.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT}`)
    })

    // Start job
    if (env.TRACKER_ENABLED) {
      console.log('Starting stock checker job...')
      stockCheckerJob.start()
      stockCheckerJob.execute()
      console.log('Stock checker job started')
      console.log('Starting activity notifier job...')
      activityNotifierJob.start()
      console.log('Activity notifier job started')
    } else {
      console.log('Stock tracker is disabled. Skipping job execution.')
    }
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err)
    process.exit(1) // Exit the process if MongoDB connection fails
  })
