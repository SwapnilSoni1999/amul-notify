import { AmulApi } from './amulApi.lib'
import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import env from '@/env'
import {
  AddressRecordResponse,
  SendOtpResponse,
  VerifyOtpResponse
} from '@/types/orderApi.types'

const API_BASE_URL = env.ORDER_SERVER_API_URL

export class AmulAutoOrder {
  private amulApi: AmulApi
  private orderApi: ReturnType<typeof wrapper>
  constructor(amulApi: AmulApi) {
    this.amulApi = amulApi
    this.orderApi = wrapper(
      axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true
      })
    )
  }

  async sendOtp(phone: string): Promise<SendOtpResponse> {
    const cookieString = await this.amulApi.session_cookie
    const pincodeRecord = this.amulApi.pincode_record

    const response = await this.orderApi.post('/send-otp', {
      phone,
      cookieString,
      substore: pincodeRecord.substore,
      pincode: pincodeRecord.pincode
    })

    return response.data
  }

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    const cookieString = await this.amulApi.session_cookie
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

    return response.data
  }

  async fetchAddresses(): Promise<AddressRecordResponse> {
    const cookieString = await this.amulApi.session_cookie

    const response = await this.orderApi.post<AddressRecordResponse>(
      '/fetch-addresses',
      {
        cookieString
      }
    )

    return response.data
  }
}
