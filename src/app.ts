import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import env from './env'
import UserModel from './models/user.model'
import BoundaryModel from './models/boundary.model'
import bot from './bot'
import { recordAutoBookingPaymentCallback } from './services/payment.service'
import {
  buildAutoOrderKeyboard,
  buildAutoOrderOverviewMessage
} from './utils/autoOrder.util'
import { emojis } from './utils/emoji.util'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan(env.NODE_ENV !== 'production' ? 'dev' : 'combined'))

if (env.NODE_ENV === 'production') {
  app.enable('trust proxy')
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const getBotUrl = async (): Promise<string> => {
  const botInfo = bot.botInfo || (await bot.telegram.getMe())
  return `https://t.me/${botInfo.username}`
}

const getQueryString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return getQueryString(value[0])
  }

  return typeof value === 'string' ? value : ''
}

app.get('/payment/success', async (req, res) => {
  const botUrl = await getBotUrl()
  const paymentId = getQueryString(req.query.razorpay_payment_id)
  const paymentLinkId = getQueryString(req.query.razorpay_payment_link_id)
  const paymentStatus = getQueryString(req.query.razorpay_payment_link_status)
  const referenceId = getQueryString(
    req.query.razorpay_payment_link_reference_id
  )
  const signature = getQueryString(req.query.razorpay_signature)

  const renderPaymentPage = (payload: {
    title: string
    message: string
    successful: boolean
    details?: string[]
  }) => {
    const details = payload.details || []

    res.status(payload.successful ? 200 : 400)
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="4;url=${botUrl}">
    <title>${escapeHtml(payload.title)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        align-items: center;
        background: #f5f7fb;
        color: #172033;
        display: flex;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }

      main {
        background: #ffffff;
        border: 1px solid #dfe6f2;
        border-radius: 8px;
        box-shadow: 0 18px 45px rgba(23, 32, 51, 0.08);
        max-width: 420px;
        padding: 32px;
        text-align: center;
        width: 100%;
      }

      .mark {
        align-items: center;
        background: ${payload.successful ? '#16a34a' : '#dc2626'};
        border-radius: 999px;
        color: #ffffff;
        display: inline-flex;
        font-size: 28px;
        font-weight: 700;
        height: 56px;
        justify-content: center;
        margin-bottom: 18px;
        width: 56px;
      }

      h1 {
        font-size: 24px;
        line-height: 1.2;
        margin: 0 0 10px;
      }

      p {
        color: #526071;
        font-size: 15px;
        line-height: 1.5;
        margin: 0;
      }

      dl {
        background: #f8fafc;
        border-radius: 8px;
        color: #334155;
        font-size: 14px;
        line-height: 1.6;
        margin: 20px 0;
        padding: 14px;
        text-align: left;
      }

      a {
        background: #229ed9;
        border-radius: 8px;
        color: #ffffff;
        display: inline-block;
        font-weight: 700;
        margin-top: 24px;
        padding: 12px 18px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">${payload.successful ? '&#10003;' : '!'}</div>
      <h1>${escapeHtml(payload.title)}</h1>
      <p>${escapeHtml(payload.message)}</p>
      ${
        details.length
          ? `<dl>${details.map((detail) => `<div>${detail}</div>`).join('')}</dl>`
          : ''
      }
      <a href="${botUrl}">Open Bot</a>
    </main>
  </body>
</html>`)
  }

  if (
    !paymentId ||
    !paymentLinkId ||
    !paymentStatus ||
    !referenceId ||
    !signature
  ) {
    return renderPaymentPage({
      title: 'Payment Not Verified',
      message: 'Missing Razorpay payment details. Redirecting you to Telegram.',
      successful: false
    })
  }

  const details = [
    paymentStatus ? `Status: ${escapeHtml(paymentStatus)}` : null,
    paymentId ? `Payment ID: ${escapeHtml(paymentId)}` : null,
    referenceId ? `Reference: ${escapeHtml(referenceId)}` : null
  ].filter((detail): detail is string => Boolean(detail))

  try {
    const result = await recordAutoBookingPaymentCallback(
      {
        payment_id: paymentId,
        payment_link_id: paymentLinkId,
        payment_link_reference_id: referenceId,
        payment_link_status: paymentStatus
      },
      signature,
      {
        razorpay_payment_id: paymentId,
        razorpay_payment_link_id: paymentLinkId,
        razorpay_payment_link_reference_id: referenceId,
        razorpay_payment_link_status: paymentStatus,
        razorpay_signature: signature
      }
    )

    if (!result.paid) {
      return renderPaymentPage({
        title: 'Payment Not Completed',
        message: 'The payment was not completed. Redirecting you to Telegram.',
        successful: false,
        details
      })
    }

    result.user.set('orderSettings.enabled', true)
    await result.user.save()

    if (result.user.tgId) {
      await bot.telegram.sendMessage(
        result.user.tgId,
        [
          `${emojis.checkMark} <b>Payment received</b>`,
          `Auto-booking is now enabled for 30 days.`,
          ``,
          buildAutoOrderOverviewMessage(result.user, result.payment)
        ].join('\n'),
        {
          parse_mode: 'HTML',
          reply_markup: buildAutoOrderKeyboard(result.user).reply_markup
        }
      )
    }

    return renderPaymentPage({
      title: 'Payment Successful',
      message: 'Auto-booking is enabled. Redirecting you back to Telegram.',
      successful: true,
      details
    })
  } catch (err) {
    console.error('Failed to process Razorpay payment callback:', err)

    return renderPaymentPage({
      title: 'Payment Not Verified',
      message: 'We could not verify this payment. Redirecting you to Telegram.',
      successful: false,
      details
    })
  }
})

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
