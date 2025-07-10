import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import env from './env'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan(env.NODE_ENV !== 'production' ? 'dev' : 'combined'))

if (env.NODE_ENV === 'production') {
  app.enable('trust proxy')
}

export default app
