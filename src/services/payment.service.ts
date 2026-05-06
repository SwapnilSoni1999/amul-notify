import {
  AUTO_BOOKING_PAYMENT_AMOUNT,
  AUTO_BOOKING_PAYMENT_CURRENCY,
  AUTO_BOOKING_PAYMENT_VALID_DAYS
} from '@/config'
import env from '@/env'
import PaymentModel, { HydratedPayment } from '@/models/payment.model'
import UserModel, { HydratedUser } from '@/models/user.model'
import {
  RazorpayPaymentLinkCallback,
  createPaymentLink,
  verifyPaymentLinkSignature
} from '@/services/razorpay.service'
import { Types } from 'mongoose'

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const buildReferenceId = (user: HydratedUser): string => {
  return `ab_${user._id.toString()}_${Date.now().toString(36)}`
}

export const hasValidAutoBookingPayment = async (
  userId: Types.ObjectId | string
): Promise<boolean> => {
  const payment = await PaymentModel.exists({
    user: userId,
    status: 'paid',
    validUntil: {
      $gt: new Date()
    }
  })

  return Boolean(payment)
}

export const getLatestAutoBookingPayment = async (
  userId: Types.ObjectId | string
): Promise<HydratedPayment | null> => {
  return PaymentModel.findOne({
    user: userId,
    status: {
      $in: ['paid', 'expired']
    }
  }).sort({ validUntil: -1, createdAt: -1 })
}

export const clearUserAutoBookingAccess = async (
  user: HydratedUser
): Promise<void> => {
  user.set('orderSettings.enabled', false)
  user.set('orderSettings.skus', [])
  user.cookies.splice(0, user.cookies.length)
  user.set('amulUserId', undefined)
  user.set('amulCartId', undefined)
  user.set('address', undefined)
  await user.save()
}

export const createAutoBookingPaymentLink = async (
  user: HydratedUser
): Promise<HydratedPayment> => {
  const redirectUrl = env.RAZORPAY_REDIRECT_URL?.trim()
  if (!redirectUrl) {
    throw new Error(
      'RAZORPAY_REDIRECT_URL is required to create auto-booking payment links'
    )
  }

  const customerName = [user.firstName, user.lastName].filter(Boolean).join(' ')
  const referenceId = buildReferenceId(user)

  const paymentLink = await createPaymentLink({
    amount: AUTO_BOOKING_PAYMENT_AMOUNT,
    currency: AUTO_BOOKING_PAYMENT_CURRENCY,
    description: 'Auto Booking Service',
    reference_id: referenceId,
    customer: {
      ...(customerName ? { name: customerName } : {}),
      ...(user.phone ? { contact: `+91${user.phone}` } : {})
    },
    notify: {
      sms: false,
      email: false
    },
    reminder_enable: false,
    callback_url: redirectUrl,
    options: {
      checkout: {
        name: 'Amul Notify'
      }
    },
    notes: {
      source: 'auto_booking',
      user_id: user._id.toString(),
      tg_id: user.tgId ? String(user.tgId) : '',
      tg_username: user.tgUsername || ''
    }
  })

  return PaymentModel.findOneAndUpdate(
    {
      referenceId
    },
    {
      $set: {
        user: user._id,
        tgId: user.tgId,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        status: paymentLink.status,
        razorpayPaymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  ).orFail()
}

export const recordAutoBookingPaymentCallback = async (
  callback: RazorpayPaymentLinkCallback,
  signature: string,
  rawPayload: Record<string, string>
): Promise<{
  payment: HydratedPayment
  user: HydratedUser
  paid: boolean
  verified: boolean
}> => {
  const verified = verifyPaymentLinkSignature(callback, signature)
  if (!verified) {
    return Promise.reject(new Error('Invalid Razorpay payment signature'))
  }

  const payment = await PaymentModel.findOne({
    $or: [
      { razorpayPaymentLinkId: callback.payment_link_id },
      { referenceId: callback.payment_link_reference_id }
    ]
  }).orFail()

  const status = callback.payment_link_status
  payment.status = status as HydratedPayment['status']
  payment.callbackPayload = rawPayload

  if (status === 'paid') {
    const now = new Date()
    payment.razorpayPaymentId = callback.payment_id
    payment.paidAt = payment.paidAt || now
    payment.validUntil =
      payment.validUntil || addDays(now, AUTO_BOOKING_PAYMENT_VALID_DAYS)
  }

  await payment.save()

  const user = await UserModel.findById(payment.user).orFail()

  return {
    payment,
    user,
    paid: status === 'paid',
    verified
  }
}

export const expirePayment = async (
  payment: HydratedPayment
): Promise<void> => {
  payment.status = 'expired'
  payment.expiredNotifiedAt = new Date()
  await payment.save()
}
