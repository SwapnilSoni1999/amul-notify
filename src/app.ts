import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import env from './env'
import UserModel from './models/user.model'
import BoundaryModel from './models/boundary.model'

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
    label: 'Users',
    message: String(count),
    color: 'blue'
  })
})

app.get('/api/pincode/:pin', async (req, res) => {
  const pin = req.params.pin
  if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'Bad pin' })
  const doc = await BoundaryModel.findOne(
    { 'properties.Pincode': pin },
    { _id: 0 }
  ).lean()
  if (!doc) return res.status(404).json({ error: 'Not found' })

  const totalUsers = await UserModel.countDocuments({ pincode: pin })

  console.log({ pincode: pin, totalUsers })

  res.set('Cache-Control', 'public, max-age=86400, immutable')
  res.json({
    ...doc,
    totalUsers
  })
})

export default app
