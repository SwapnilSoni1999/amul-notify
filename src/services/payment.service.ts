import {
  AUTO_BOOKING_PAYMENT_CURRENCY,
  AUTO_BOOKING_PAYMENT_PLANS,
  AutoBookingPaymentPlan,
  DEFAULT_AUTO_BOOKING_PAYMENT_PLAN
} from '@/config'
import env from '@/env'
import PaymentModel, { HydratedPayment } from '@/models/payment.model'
import UserModel, { HydratedUser } from '@/models/user.model'
import {
  RazorpayPaymentLinkCallback,
  RazorpayPaymentLinkUpdate,
  RazorpayWebhookEvent,
  createPaymentLink,
  getPaymentLinkUpdateFromWebhook,
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

const buildFreeTrialReferenceId = (user: HydratedUser): string => {
  return `ab_trial_${user._id.toString()}_${Date.now().toString(36)}`
}

interface GrantAutoBookingFreeTrialOptions {
  grantedBy?: HydratedUser
  referenceId?: string
  source?: string
}

export interface RecordAutoBookingPaymentResult {
  payment: HydratedPayment
  user: HydratedUser
  paid: boolean
  activated: boolean
  verified: boolean
}

const findAutoBookingPaymentPlan = (amount: number) => {
  return (
    AUTO_BOOKING_PAYMENT_PLANS.find((plan) => plan.amount === amount) ||
    DEFAULT_AUTO_BOOKING_PAYMENT_PLAN
  )
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
  user: HydratedUser,
  plan: AutoBookingPaymentPlan = DEFAULT_AUTO_BOOKING_PAYMENT_PLAN
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
    amount: plan.amount,
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
      plan_id: plan.id,
      validity_days: String(plan.validityInDays),
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

export const grantAutoBookingFreeTrial = async (
  user: HydratedUser,
  durationMs: number,
  options: GrantAutoBookingFreeTrialOptions = {}
): Promise<HydratedPayment> => {
  const {
    grantedBy,
    referenceId = buildFreeTrialReferenceId(user),
    source = 'free_trial'
  } = options
  const now = new Date()
  const latestActivePayment = await PaymentModel.findOne({
    user: user._id,
    status: 'paid',
    validUntil: {
      $gt: now
    }
  }).sort({ validUntil: -1, createdAt: -1 })

  const baseDate = latestActivePayment?.validUntil ?? now
  const validUntil = new Date(baseDate.getTime() + durationMs)

  const payment = await PaymentModel.findOneAndUpdate(
    {
      referenceId
    },
    {
      $set: {
        user: user._id,
        tgId: user.tgId,
        amount: 0,
        currency: AUTO_BOOKING_PAYMENT_CURRENCY,
        status: 'paid',
        razorpayPaymentLinkId: referenceId,
        shortUrl: `free-trial://${referenceId}`,
        paidAt: now,
        validUntil,
        callbackPayload: {
          source,
          durationMs,
          ...(grantedBy
            ? {
                grantedByUserId: grantedBy._id.toString(),
                grantedByTgId: grantedBy.tgId,
                grantedByTgUsername: grantedBy.tgUsername || ''
              }
            : {})
        }
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  ).orFail()

  user.set('orderSettings.permitted', true)
  user.set('orderSettings.enabled', true)
  await user.save()

  return payment
}

const recordAutoBookingPaymentUpdate = async (
  callback: RazorpayPaymentLinkUpdate,
  rawPayload: Record<string, unknown>,
  verified: boolean
): Promise<RecordAutoBookingPaymentResult> => {
  const payment = await PaymentModel.findOne({
    $or: [
      { razorpayPaymentLinkId: callback.payment_link_id },
      { referenceId: callback.payment_link_reference_id }
    ]
  }).orFail()

  const status = callback.payment_link_status
  const hadRecordedPaidAccess = Boolean(
    payment.razorpayPaymentId || payment.paidAt || payment.validUntil
  )
  payment.status = status as HydratedPayment['status']
  payment.callbackPayload = rawPayload
  let activated = false

  if (status === 'paid') {
    const now = new Date()
    const plan = findAutoBookingPaymentPlan(payment.amount)
    if (callback.payment_id) {
      payment.razorpayPaymentId = callback.payment_id
    }
    payment.paidAt = payment.paidAt || now
    payment.validUntil = payment.validUntil || addDays(now, plan.validityInDays)
    activated = !hadRecordedPaidAccess
  }

  await payment.save()

  const user = await UserModel.findById(payment.user).orFail()

  return {
    payment,
    user,
    paid: status === 'paid',
    activated,
    verified
  }
}

export const recordAutoBookingPaymentCallback = async (
  callback: RazorpayPaymentLinkCallback,
  signature: string,
  rawPayload: Record<string, unknown>
): Promise<RecordAutoBookingPaymentResult> => {
  const verified = verifyPaymentLinkSignature(callback, signature)
  if (!verified) {
    return Promise.reject(new Error('Invalid Razorpay payment signature'))
  }

  return recordAutoBookingPaymentUpdate(callback, rawPayload, verified)
}

export const recordAutoBookingPaymentWebhook = async (
  webhook: RazorpayWebhookEvent
): Promise<RecordAutoBookingPaymentResult | null> => {
  const update = getPaymentLinkUpdateFromWebhook(webhook)
  if (!update) {
    return null
  }

  return recordAutoBookingPaymentUpdate(update, webhook, true)
}

export const expirePayment = async (
  payment: HydratedPayment
): Promise<void> => {
  payment.status = 'expired'
  payment.expiredNotifiedAt = new Date()
  await payment.save()
}

export const expireActiveAutoBookingPayments = async (
  user: HydratedUser
): Promise<HydratedPayment[]> => {
  const payments = await PaymentModel.find({
    user: user._id,
    status: 'paid',
    validUntil: {
      $gt: new Date()
    }
  })

  for (const payment of payments) {
    await expirePayment(payment)
  }

  await clearUserAutoBookingAccess(user)

  return payments
}
