import axios, { AxiosInstance } from 'axios'
import env from '@/env'
import { createHmac, timingSafeEqual } from 'crypto'

const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1'
const MIN_EXPIRE_SECONDS_FROM_NOW = 15 * 60
const MAX_REFERENCE_ID_LENGTH = 40
const MAX_DESCRIPTION_LENGTH = 2048
const MAX_NOTES_COUNT = 15
const MAX_NOTE_VALUE_LENGTH = 255

type NoteValue = string | number | boolean

export interface CreatePaymentLinkInput {
  amount: number
  currency?: string
  expire_by?: number
  reference_id?: string
  description?: string
  customer?: {
    name?: string
    contact?: string
    email?: string
  }
  notify?: {
    sms?: boolean
    email?: boolean
  }
  reminder_enable?: boolean
  notes?: Record<string, NoteValue>
  callback_url?: string
  callback_method?: 'get'
  options?: {
    checkout?: {
      name?: string
    }
  }
}

interface RazorpayPaymentLinkRequest extends CreatePaymentLinkInput {
  upi_link: true
  currency: string
  accept_partial: false
  callback_method?: 'get'
}

export interface RazorpayPaymentLink {
  id: string
  short_url: string
  status: 'created' | 'partially_paid' | 'expired' | 'cancelled' | 'paid'
  amount: number
  amount_paid: number
  currency: string
  upi_link: boolean | 'true' | 'false'
  accept_partial: boolean
  reference_id?: string
  description?: string
  expire_by: number
  expired_at: number
  cancelled_at: number
  created_at: number
  updated_at: number | null
  customer?: {
    name?: string
    contact?: string
    email?: string
  }
  notify?: {
    sms?: boolean
    email?: boolean
  }
  reminder_enable?: boolean
  notes?: Record<string, NoteValue>
  options?: {
    checkout?: {
      name?: string
    }
  }
  payments: unknown[] | null
  user_id: string
}

interface RazorpayErrorResponse {
  error?: {
    code?: string
    description?: string
    reason?: string | null
    source?: string | null
    step?: string | null
  }
}

export interface RazorpayPaymentLinkCallback {
  payment_id: string
  payment_link_id: string
  payment_link_reference_id: string
  payment_link_status: string
}

const getRazorpayClient = (): AxiosInstance => {
  if (!env.RAZORPAY_API_KEY?.trim() || !env.RAZORPAY_API_SECRET?.trim()) {
    throw new Error(
      'RAZORPAY_API_KEY and RAZORPAY_API_SECRET are required to create payment links'
    )
  }

  return axios.create({
    baseURL: RAZORPAY_API_BASE_URL,
    auth: {
      username: env.RAZORPAY_API_KEY,
      password: env.RAZORPAY_API_SECRET
    },
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

const validatePaymentLinkInput = (input: CreatePaymentLinkInput): void => {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Payment link amount must be a positive integer')
  }

  const currency = input.currency || 'INR'
  if (currency !== 'INR') {
    throw new Error('UPI payment links are supported only for INR currency')
  }

  if (
    input.reference_id &&
    input.reference_id.length > MAX_REFERENCE_ID_LENGTH
  ) {
    throw new Error(
      `Payment link reference_id must not exceed ${MAX_REFERENCE_ID_LENGTH} characters`
    )
  }

  if (input.description && input.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Payment link description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`
    )
  }

  if (input.expire_by) {
    const earliestAllowedExpiry =
      Math.floor(Date.now() / 1000) + MIN_EXPIRE_SECONDS_FROM_NOW

    if (input.expire_by < earliestAllowedExpiry) {
      throw new Error(
        'Payment link expire_by must be at least 15 minutes in the future'
      )
    }
  }

  if (input.callback_url) {
    try {
      new URL(input.callback_url)
    } catch {
      throw new Error('Payment link callback_url must be a valid URL')
    }
  }

  if (input.callback_method && !input.callback_url) {
    throw new Error(
      'Payment link callback_url is required when callback_method is provided'
    )
  }

  if (input.notes) {
    const notes = Object.entries(input.notes)

    if (notes.length > MAX_NOTES_COUNT) {
      throw new Error(
        `Payment link notes must not exceed ${MAX_NOTES_COUNT} entries`
      )
    }

    const invalidNote = notes.find(
      ([, value]) => String(value).length > MAX_NOTE_VALUE_LENGTH
    )

    if (invalidNote) {
      throw new Error(
        `Payment link note "${invalidNote[0]}" must not exceed ${MAX_NOTE_VALUE_LENGTH} characters`
      )
    }
  }
}

const buildPaymentLinkPayload = (
  input: CreatePaymentLinkInput
): RazorpayPaymentLinkRequest => {
  const callbackMethod = input.callback_url
    ? input.callback_method || 'get'
    : input.callback_method

  return {
    ...input,
    upi_link: true,
    currency: input.currency || 'INR',
    accept_partial: false,
    ...(callbackMethod ? { callback_method: callbackMethod } : {})
  }
}

const getRazorpayErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError<RazorpayErrorResponse>(err)) {
    const razorpayError = err.response?.data?.error
    return (
      razorpayError?.description ||
      razorpayError?.reason ||
      err.message ||
      'Unknown Razorpay error'
    )
  }

  return err instanceof Error ? err.message : String(err)
}

export const verifyPaymentLinkSignature = (
  callback: RazorpayPaymentLinkCallback,
  signature: string
): boolean => {
  if (!env.RAZORPAY_API_SECRET?.trim()) {
    throw new Error(
      'RAZORPAY_API_SECRET is required to verify payment link signatures'
    )
  }

  const payload = [
    callback.payment_link_id,
    callback.payment_link_reference_id,
    callback.payment_link_status,
    callback.payment_id
  ].join('|')

  const expectedSignature = createHmac('sha256', env.RAZORPAY_API_SECRET)
    .update(payload)
    .digest('hex')

  return (
    expectedSignature.length === signature.length &&
    timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  )
}

export const createPaymentLink = async (
  input: CreatePaymentLinkInput
): Promise<RazorpayPaymentLink> => {
  validatePaymentLinkInput(input)

  try {
    const response = await getRazorpayClient().post<RazorpayPaymentLink>(
      '/payment_links',
      buildPaymentLinkPayload(input)
    )

    return response.data
  } catch (err) {
    throw new Error(
      `Failed to create Razorpay UPI payment link: ${getRazorpayErrorMessage(
        err
      )}`
    )
  }
}

export default {
  createPaymentLink,
  verifyPaymentLinkSignature
}
