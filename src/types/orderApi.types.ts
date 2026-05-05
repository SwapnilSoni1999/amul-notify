export type CookieExpiryRecord = {
  key: string
  value: string
  domain?: string
  path?: string
  expiresAt: string | null
  ttlSeconds: number | null
  isSession: boolean
  isExpired: boolean
}

export interface CookieResponseBase {
  cookieString: string
  cookieExpiry: CookieExpiryRecord[]
}

export interface SendOtpResponse extends CookieResponseBase {
  otpSent: boolean
  status: unknown
  phone: string
  pincode: string
  substore: string
}

export interface VerifyOtpResponse extends CookieResponseBase {
  otpVerified: boolean
  userId: string
  cartId: string
  substore: string
}

export interface AddressRecordResponse extends CookieResponseBase {
  userId: string
  addresses: AddressRecord[]
}

export interface AddressRecord {
  _id: string
  full_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
}

export interface SetAddressResponse extends CookieResponseBase {
  addressSet: boolean
  userId: string
  cartId: string
  address: AddressRecord
}

export interface PlaceOrderResponse extends CookieResponseBase {
  userId: string
  cartId: string
  substore: string
  paymentUrl?: string
  result: {
    data?: {
      gatewayInfo?: {
        url?: string
      }
    }
  }
}
