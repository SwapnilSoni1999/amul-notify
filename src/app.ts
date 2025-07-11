import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import env from './env'
import UserModel from './models/user.model'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan(env.NODE_ENV !== 'production' ? 'dev' : 'combined'))

if (env.NODE_ENV === 'production') {
  app.enable('trust proxy')
}

app.use('/amul-bot/badge', async (req, res) => {
  const count = await UserModel.countDocuments({})
  res.json({
    schemaVersion: 1,
    label: 'users',
    message: String(count),
    color: 'blue'
  })
})

export default app
