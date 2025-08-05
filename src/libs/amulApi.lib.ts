import cacheService from '@/services/cache.service'
import {
  AmulPincodeResponse,
  AmulProduct,
  AmulProductsResponse,
  AmulSessionInfo,
  PincodeRecord
} from '@/types/amul.types'
import { logToChannel } from '@/utils/logger.util'
import { substoreList } from '@/utils/substores'
import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar, parse as parseCookie } from 'tough-cookie'

// interface AmulSessionKey {
//   pincode: string
//   substore: string
// }
export const substoreSessions: Map<string, AmulApi> = new Map()

export const defaultHeaders = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  base_url: 'https://shop.amul.com/en/browse/protein',
  'cache-control': 'no-cache',
  frontend: '1',
  pragma: 'no-cache',
  priority: 'u=1, i',
  referer: 'https://shop.amul.com/',
  'sec-ch-ua':
    '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
}

export class AmulApi {
  private pincodeRecord!: PincodeRecord
  public amulApi: ReturnType<typeof wrapper>
  private tid: string | undefined
  private jar: CookieJar
  public instanceInitializedAt: Date = new Date()

  constructor() {
    const jar = new CookieJar()

    this.jar = jar

    axios.defaults.jar = jar // Set the cookie jar globally for axios

    const amulApi = wrapper(
      axios.create({
        jar, // tough‐cookie jar
        withCredentials: true,
        headers: defaultHeaders
      })
    )

    this.amulApi = amulApi
  }

  public async initCookies() {
    const cookieResponse = await this.amulApi.get(
      'https://shop.amul.com/en/browse/protein'
    )

    // console.log('Cookie Response:', cookieResponse.headers['set-cookie'])

    if (!cookieResponse.headers['set-cookie']) {
      throw new Error('No cookies received from Amul API')
    }

    const parsedCookies = cookieResponse.headers['set-cookie'].map(
      (cookieStr) => parseCookie(cookieStr, { loose: true })
    )

    for (const cookie of parsedCookies) {
      if (!cookie || !cookie.key) {
        console.warn('Invalid cookie:', cookie)
        continue
      }

      await this.jar.setCookie(cookie, 'https://shop.amul.com')
    }

    // console.log('Parsed Cookies:', parsedCookies)

    const infoResponse = await this.amulApi.get<string>(
      `https://shop.amul.com/user/info.js?_v=${Date.now()}`,
      {
        headers: {
          ...defaultHeaders,
          cookie: await this.jar.getCookieString('https://shop.amul.com'),
          tid: await this.calculateTidHeader()
        }
      }
    )
    // console.log('User Info Response:', infoResponse.data)
    const sessionObj = JSON.parse(
      infoResponse.data.replace('session = ', '')
    ) as AmulSessionInfo
    // console.log('Session Object:', sessionObj.tid)
    this.tid = sessionObj.tid
    console.log('TID:', this.tid)
  }

  public async setPincode(record: PincodeRecord) {
    // await setPincodeQueue({
    //   tid: await this.calculateTidHeader(),
    //   cookieStr: await this.jar.getCookieString('https://shop.amul.com'),
    //   record,
    //   amulApi: this.amulApi
    // })

    const tid = await this.calculateTidHeader()
    const cookieStr = await this.jar.getCookieString('https://shop.amul.com')

    const response = await this.amulApi.put(
      'https://shop.amul.com/entity/ms.settings/_/setPreferences',
      {
        data: {
          store: record.substore
        }
      },
      {
        headers: {
          ...defaultHeaders,
          tid: tid,
          cookie: cookieStr // Use the cookie string from the job data
        }
      }
    )
    console.log('Set Pincode Response:', response.data)
    this.pincodeRecord = record

    const existingSubstore: AmulApi | undefined = substoreSessions.get(
      record.substore.toString()
    )

    if (!existingSubstore) {
      substoreSessions.set(record.substore.toString(), this)
      console.log(`Added new substore session for ${record.substore}`)
    } else {
      console.log(`Using existing substore session for ${record.substore}`)
    }
  }

  public async searchPincode(pincode: string) {
    const response = await this.amulApi.get<AmulPincodeResponse>(
      `https://shop.amul.com/entity/pincode?limit=50&filters[0][field]=pincode&filters[0][value]=${pincode}&filters[0][operator]=regex&cf_cache=1h`,
      {
        headers: {
          ...defaultHeaders,
          tid: await this.calculateTidHeader(),
          cookie: await this.jar.getCookieString('https://shop.amul.com')
        }
      }
    )

    return response.data.records
  }

  public getSubstore(): string | undefined {
    return this.pincodeRecord.substore
  }
  public getSubstoreId(): string | undefined {
    return substoreList.find(
      (substore) => substore.alias === this.getSubstore()
    )?._id
  }
  public getPincode(): string | undefined {
    return this.pincodeRecord.pincode
  }

  private async calculateTidHeader(): Promise<string> {
    const storeID = '62fa94df8c13af2e242eba16' // Amul Store ID
    const timestamp = Date.now().toString()
    const encoder = new TextEncoder()
    const rand = parseInt((1000 * Math.random()).toString(), 10)
    const sessionID = this.tid!
    const c = encoder.encode(`${storeID}:${timestamp}:${rand}:${sessionID}`)
    const data = await crypto.subtle.digest('SHA-256', c)
    const hash = Array.from(new Uint8Array(data))
      .map((e) => e.toString(16).padStart(2, '0'))
      .join('')
    console.log(`Calculated TID: ${timestamp}:${rand}:${hash}`)
    return `${timestamp}:${rand}:${hash}`
  }

  public async getProteinProducts(opts?: {
    bypassCache?: boolean
    search?: string
  }): Promise<AmulProduct[]> {
    const { bypassCache = true } = opts || {}

    const cachedProducts = await cacheService.products.get({
      substore: this.pincodeRecord.substore
    })

    // console.log(`Cached Products:`, cachedProducts)

    if (cachedProducts && !bypassCache) {
      return cachedProducts.data
    }

    console.log(`SubstoreId:`, this.getSubstoreId())

    // console.log(
    //   `Cookies:`,
    //   await this.jar.getCookieString('https://shop.amul.com')
    // )

    // console.log(`Headers:`, {
    //   ...defaultHeaders,
    //   cookie: await this.jar.getCookieString('https://shop.amul.com')
    //   // tid: await this.calculateTidHeader()
    // })
    const response = await axios.get<AmulProductsResponse>(
      `https://shop.amul.com/api/1/entity/ms.products?fields[name]=1&fields[brand]=1&fields[categories]=1&fields[collections]=1&fields[alias]=1&fields[sku]=1&fields[price]=1&fields[compare_price]=1&fields[original_price]=1&fields[images]=1&fields[metafields]=1&fields[discounts]=1&fields[catalog_only]=1&fields[is_catalog]=1&fields[seller]=1&fields[available]=1&fields[inventory_quantity]=1&fields[net_quantity]=1&fields[num_reviews]=1&fields[avg_rating]=1&fields[inventory_low_stock_quantity]=1&fields[inventory_allow_out_of_stock]=1&fields[default_variant]=1&fields[variants]=1&fields[lp_seller_ids]=1&filters[0][field]=categories&filters[0][value][0]=protein&filters[0][operator]=in&filters[0][original]=1&facets=true&facetgroup=default_category_facet&limit=32&total=1&start=0&substore=${this.getSubstoreId()}`,
      {
        headers: {
          ...defaultHeaders,
          cookie: await this.jar.getCookieString('https://shop.amul.com'),
          tid: await this.calculateTidHeader()
        }
      }
    )

    if (!response.data.data.length) {
      console.warn(
        `No products found for substore ${this.getSubstoreId()} with pincode ${this.getPincode()}`
      )
      logToChannel(
        `No products found for substore ${this.getSubstoreId()} with pincode ${this.getPincode()}`
      )
      return []
    }

    // console.log('Response:', response.request)

    await cacheService.products.set(
      {
        substore: this.pincodeRecord.substore
      },
      response.data
    )

    if (opts?.search?.length) {
      // const searchRegex = new RegExp(opts.search, 'i')
      const fuzzySearchRegex = new RegExp(
        `${opts.search.split('').join('.*?')}`,
        'i'
      )
      const filteredProducts = response.data.data.filter(
        (product) =>
          fuzzySearchRegex.test(product.name) ||
          fuzzySearchRegex.test(product.sku) ||
          fuzzySearchRegex.test(product.alias)
      )

      return filteredProducts
    }

    return response.data.data
  }

  public close() {
    substoreSessions.delete(this.pincodeRecord.substore)
  }
}

const createAmulApi = async (pincode: string) => {
  console.log(`Creating new AmulApi instance for pincode: ${pincode}`)
  const amulApi = new AmulApi()
  console.log('Initialized AmulApi instance')
  await amulApi.initCookies()
  console.log('Cookies initialized for AmulApi instance')

  const records = await amulApi.searchPincode(pincode)
  console.log(`Found records for pincode ${pincode}:`, records)
  if (!records.length) {
    throw new Error(`No pincode found for ${pincode}`)
  }
  console.log(`Setting pincode for AmulApi instance:`, records[0])
  const record = records[0]
  console.log(
    `Setting pincode: ${record.pincode}, substore: ${record.substore}`
  )
  await amulApi.setPincode(record)
  console.log(
    `Pincode set successfully for AmulApi instance: ${record.pincode}, substore: ${record.substore}`
  )
  return amulApi
}

export const getOrCreateAmulApi = async (substore?: string | null) => {
  if (!substore) {
    return {} as AmulApi
  }
  let existingSession: AmulApi | undefined
  for (const [key, session] of substoreSessions.entries()) {
    if (key === substore) {
      existingSession = session
      console.log(`Found existing session for substore ${key}, using it.`)
      break
    }
  }

  console.log(
    `getOrCreateAmulApi called with substore: ${substore}, existing session: ${!!existingSession}`
  )

  return existingSession || (await createAmulApi(substore))
}
