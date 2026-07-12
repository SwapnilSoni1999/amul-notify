import { AmulApi } from './amulApi.lib'
import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import env from '@/env'
import type { IUser } from '@/models/user.model'
import {
  AddressRecordResponse,
  PlaceOrderResponse,
  SendOtpResponse,
  SetAddressResponse,
  VerifyOtpResponse
} from '@/types/orderApi.types'
import { serializeStoredCookies } from '@/utils/cookie.util'

const API_BASE_URL = env.ORDER_SERVER_API_URL

export class AmulAutoOrder {
  private amulApi: AmulApi
  private orderApi: ReturnType<typeof wrapper>
  private cookieString: string | undefined

  constructor(amulApi: AmulApi, cookies?: IUser['cookies']) {
    if (
      !env.ORDER_SERVER_API_URL?.trim() ||
      !env.ORDER_SERVER_API_KEY?.trim()
    ) {
      throw new Error(
        'ORDER_SERVER_API_URL and ORDER_SERVER_API_KEY are required for auto-ordering'
      )
    }

    this.amulApi = amulApi
    this.cookieString = cookies ? serializeStoredCookies(cookies) : undefined
    this.orderApi = wrapper(
      axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          'x-api-secret': env.ORDER_SERVER_API_KEY
        }
      })
    )
  }

  private async getCookieString(): Promise<string> {
    return this.cookieString ?? this.amulApi.session_cookie
  }

  async sendOtp(phone: string): Promise<SendOtpResponse> {
    const cookieString = await this.getCookieString()
    const pincodeRecord = this.amulApi.pincode_record

    const response = await this.orderApi.post('/send-otp', {
      phone,
      cookieString,
      substore: pincodeRecord.substore,
      pincode: pincodeRecord.pincode
    })

    this.cookieString = response.data.cookieString
    return response.data
  }

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    const cookieString = await this.getCookieString()
    const pincodeRecord = this.amulApi.pincode_record

    const response = await this.orderApi.post<VerifyOtpResponse>(
      '/verify-otp',
      {
        phone,
        cookieString,
        substore: pincodeRecord.substore,
        pincode: pincodeRecord.pincode,
        otp
      }
    )

    this.cookieString = response.data.cookieString
    return response.data
  }

  async fetchAddresses(): Promise<AddressRecordResponse> {
    const cookieString = await this.getCookieString()

    const response = await this.orderApi.post<AddressRecordResponse>(
      '/fetch-addresses',
      {
        cookieString
      }
    )

    this.cookieString = response.data.cookieString
    return response.data
  }

  async setAddress(
    addressId: string,
    cartId: string
  ): Promise<SetAddressResponse> {
    const cookieString = await this.getCookieString()
    const substore = await this.amulApi.getSubstore()

    const response = await this.orderApi.post<SetAddressResponse>(
      '/set-address',
      {
        cookieString,
        addressId,
        cartId,
        substore
      }
    )

    this.cookieString = response.data.cookieString
    return response.data
  }

  async placeOrder(payload: {
    addressId: string
    cartId: string
    sku: string
  }): Promise<PlaceOrderResponse> {
    const cookieString = await this.getCookieString()
    const substore = await this.amulApi.getSubstore()
    const quantity = 1 // Hardcoded to 1 for now, can be made dynamic in future

    const response = await this.orderApi.post<PlaceOrderResponse>(
      '/place-order',
      {
        cookieString,
        addressId: payload.addressId,
        cartId: payload.cartId,
        sku: payload.sku,
        substore,
        quantity
      }
    )

    this.cookieString = response.data.cookieString
    return response.data
  }
}

export const isAmulSessionAuthenticationError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false
  }

  const data = error.response?.data
  const code =
    data && typeof data === 'object' && 'code' in data ? data.code : undefined

  return (
    error.response?.status === 401 || code === 'AMUL_SESSION_UNAUTHENTICATED'
  )
}
