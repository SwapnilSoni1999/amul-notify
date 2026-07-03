import { IUser } from '@/models/user.model'
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
import axios, { CreateAxiosDefaults } from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar, parse as parseCookie } from 'tough-cookie'
import { AMUL_ERROR_CODE, AmulError } from './amulError.lib'
import { sleep } from '@/utils'

// interface AmulSessionKey {
//   pincode: string
//   substore: string
// }
export const substoreSessions: Map<string, AmulApi> = new Map()

export const defaultHeaders = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9,hi;q=0.8,gu;q=0.7',
  base_url: 'https://shop.amul.com/en/browse/protein',
  'cache-control': 'no-cache',
  frontend: '1',
  pragma: 'no-cache',
  priority: 'u=1, i',
  referer: 'https://shop.amul.com/en/browse/protein',
  'sec-ch-ua':
    '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
}

const productFields = [
  'name',
  'brand',
  'categories',
  'collections',
  'alias',
  'sku',
  'price',
  'compare_price',
  'original_price',
  'images',
  'metafields',
  'discounts',
  'catalog_only',
  'is_catalog',
  'seller',
  'available',
  'inventory_quantity',
  'net_quantity',
  'num_reviews',
  'avg_rating',
  'inventory_low_stock_quantity',
  'inventory_allow_out_of_stock',
  'default_variant',
  'variants',
  'lp_seller_ids'
]

const SHOP_URL = 'https://shop.amul.com'
const DEFAULT_STORE_VERSION = 5

const normalizeSetCookieHeader = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string' && value.trim()) {
    return [value]
  }

  return []
}

const applySetCookies = async (
  jar: CookieJar,
  setCookies: string[],
  requestUrl: string
) => {
  const requestHost = new URL(requestUrl).hostname

  for (const cookieString of setCookies) {
    const cookie = parseCookie(cookieString, { loose: true })
    if (!cookie || !cookie.key) continue

    cookie.domain = requestHost
    await jar.setCookie(cookie.toString(), requestUrl)
  }
}

export class AmulApi {
  private pincodeRecord!: PincodeRecord
  public amulApi: ReturnType<typeof wrapper>
  private tid: string | undefined
  private jar: CookieJar
  public instanceInitializedAt: Date = new Date()
  private storeVersion = 0

  constructor() {
    const jar = new CookieJar()

    this.jar = jar

    const axiosDefaults = axios.defaults as typeof axios.defaults & {
      jar: CookieJar
    }
    axiosDefaults.jar = jar

    const amulApi = wrapper(
      axios.create({
        jar, // tough‐cookie jar
        withCredentials: true,
        headers: defaultHeaders
      } as CreateAxiosDefaults) as ReturnType<typeof wrapper>
    )

    this.amulApi = amulApi
  }

  private async ensureStoreVersion() {
    if (this.storeVersion) return

    try {
      const response = await this.amulApi.get(
        'https://shop.amul.com/ms/store/amul/auto/EN/storeinfo.js'
      )
      const versionMatcher = /req\.query\.v\s*=\s*['"]?([^'";\s]+)['"]?/
      const match = response.data.match(versionMatcher)
      if (match && match[1]) {
        this.storeVersion = match[1]
        console.log(`Fetched store version: ${this.storeVersion}`)
      } else {
        console.warn('Store version not found in response, defaulting to 5')
        logToChannel(
          `${new Date().toISOString()} - Store version not found in response, defaulting to 5`
        )
        this.storeVersion = DEFAULT_STORE_VERSION
      }
    } catch (error) {
      console.error('Error fetching store version:', error)
      logToChannel(
        `${new Date().toISOString()} - Error fetching store version: ${error}`
      )
      this.storeVersion = DEFAULT_STORE_VERSION
    }
  }

  public injectCookies(cookies: IUser['cookies']) {
    for (const cookie of cookies) {
      this.jar.setCookieSync(
        `${cookie.key}=${cookie.value}; Expires=${new Date(cookie.expiresAt ?? '').toUTCString()}; Path=${cookie.path}; Domain=${cookie.domain}; ${
          cookie.isSession ? '' : 'HttpOnly; '
        }`,
        'https://shop.amul.com'
      )
    }
  }

  public async initCookies() {
    const cookieResponse = await this.amulApi.get(
      'https://shop.amul.com/en/browse/protein'
    )

    const setCookies = cookieResponse.headers['set-cookie']
    if (!setCookies) {
      throw new Error('No cookies received from Amul API')
    }

    const requestUrl = 'https://shop.amul.com'
    const requestHost = new URL(requestUrl).hostname

    const parsedCookies = setCookies.map((cookieStr) =>
      parseCookie(cookieStr, { loose: true })
    )

    for (const cookie of parsedCookies) {
      if (!cookie || !cookie.key) continue

      // ---- FIX: overwrite cookie domain ----
      // StoreHippo incorrectly sends Domain=storehippo.com.
      // We rewrite it so tough-cookie accepts it.
      cookie.domain = requestHost
      // Or: delete cookie.domain;  // also works, makes it host-only

      // Now tough-cookie will accept it
      await this.jar.setCookie(cookie.toString(), requestUrl)
    }

    // Now cookies are valid, fetch user/session info
    const infoResponse = await this.amulApi.get<string>(
      `https://shop.amul.com/user/info.js?_v=${Date.now()}`,
      {
        headers: {
          ...defaultHeaders,
          cookie: await this.jar.getCookieString(requestUrl),
          tid: await this.calculateTidHeader()
        }
      }
    )

    const sessionObj = JSON.parse(
      infoResponse.data.replace('session = ', '')
    ) as AmulSessionInfo

    this.tid = sessionObj.tid
    // console.log('TID:', this.tid)
  }

  get session_tid() {
    return this.tid
  }
  get session_cookie() {
    return this.jar.getCookieString('https://shop.amul.com')
  }

  get pincode_record() {
    return this.pincodeRecord
  }

  private async setStorePreference(record: PincodeRecord) {
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

    await applySetCookies(
      this.jar,
      normalizeSetCookieHeader(response.headers['set-cookie']),
      SHOP_URL
    )

    return response.data
  }

  public async setPincode(record: PincodeRecord) {
    // await setPincodeQueue({
    //   tid: await this.calculateTidHeader(),
    //   cookieStr: await this.jar.getCookieString('https://shop.amul.com'),
    //   record,
    //   amulApi: this.amulApi
    // })

    const response = await this.setStorePreference(record)
    console.log('Set Pincode Response:', response)
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
    // console.log(`Calculated TID: ${timestamp}:${rand}:${hash}`)
    return `${timestamp}:${rand}:${hash}`
  }

  private getProductListHeaders() {
    return {
      ...defaultHeaders,
      referer: 'https://shop.amul.com/en/browse/protein'
    }
  }

  private getProteinProductsUrl(substoreId?: string) {
    const params = new URLSearchParams()

    for (const field of productFields) {
      params.append(`fields[${field}]`, '1')
    }

    params.append('filters[0][field]', 'categories')
    params.append('filters[0][value][0]', 'protein')
    params.append('filters[0][operator]', 'in')
    params.append('filters[0][original]', '1')
    params.append('facets', 'true')
    params.append('facetgroup', 'default_category_facet')
    params.append('limit', '32')
    params.append('total', '1')
    params.append('start', '0')
    // params.append('cdc', '1m')
    params.append('v', (this.storeVersion || DEFAULT_STORE_VERSION).toString())
    params.append('device_type', 'other')

    if (substoreId) {
      params.append('substore', substoreId)
    }

    // StoreHippo serves different inventory when nested query brackets are encoded.
    const query = params.toString().replace(/%5B/g, '[').replace(/%5D/g, ']')

    return `https://shop.amul.com/api/1/entity/ms.products?${query}`
  }

  private async fetchProteinProducts(
    url: string,
    headers: Record<string, string>
  ): Promise<AmulProductsResponse> {
    const response = await this.amulApi.get<AmulProductsResponse>(url, {
      headers
    })
    await applySetCookies(
      this.jar,
      normalizeSetCookieHeader(response.headers['set-cookie']),
      url
    )
    return response.data
  }

  public async getProteinProducts(opts?: {
    bypassCache?: boolean
    search?: string
    retryCount?: number
  }): Promise<AmulProduct[]> {
    const ensureVersionPromise = this.ensureStoreVersion()
    const { bypassCache = true, retryCount = 0 } = opts || {}

    const cachedProducts = await cacheService.products.get({
      substore: this.pincodeRecord.substore
    })

    if (cachedProducts && !bypassCache) {
      return cachedProducts.data
    }

    const substoreId = this.getSubstoreId()

    await ensureVersionPromise
    const productsUrl = this.getProteinProductsUrl(substoreId)
    const response = await this.fetchProteinProducts(productsUrl, {
      ...this.getProductListHeaders(),
      cookie: await this.jar.getCookieString(SHOP_URL),
      tid: await this.calculateTidHeader()
    })

    if (!response.data.length) {
      console.warn(
        `No products found for substore ${this.getSubstoreId()} with pincode ${this.getPincode()}`
      )

      const maxRetries = 3
      if (retryCount < maxRetries) {
        await this.setStorePreference(this.pincodeRecord).catch((error) => {
          console.warn(
            `Failed to refresh Amul store preference for ${this.getSubstore()}:`,
            error
          )
          logToChannel(
            `${new Date().toISOString()} - Failed to refresh Amul store preference for ${this.getSubstore()}: ${error}`
          )
        })

        console.log(
          `Retrying getProteinProducts (attempt ${retryCount + 1}/${maxRetries})...`
        )
        await sleep(500)
        return this.getProteinProducts({
          bypassCache: true,
          search: opts?.search,
          retryCount: retryCount + 1
        })
      }

      logToChannel(
        `No products found for substore ${this.getSubstoreId()} with pincode ${this.getPincode()}, after ${maxRetries} attempts: ${this.getProteinProductsUrl(substoreId)}`
      )
      return []
    }

    // console.log('Response:', response.request)

    await cacheService.products.set(
      {
        substore: this.pincodeRecord.substore
      },
      response
    )

    if (opts?.search?.length) {
      // const searchRegex = new RegExp(opts.search, 'i')
      const fuzzySearchRegex = new RegExp(
        `${opts.search.split('').join('.*?')}`,
        'i'
      )
      const filteredProducts = response.data.filter(
        (product) =>
          fuzzySearchRegex.test(product.name) ||
          fuzzySearchRegex.test(product.sku) ||
          fuzzySearchRegex.test(product.alias)
      )

      return filteredProducts
    }

    return response.data
  }

  public close() {
    substoreSessions.delete(this.pincodeRecord.substore)
  }
}

const createAmulApi = async (pincode: string) => {
  // console.log(`Creating new AmulApi instance for pincode: ${pincode}`)
  const amulApi = new AmulApi()
  // console.log('Initialized AmulApi instance')
  await amulApi.initCookies()
  // console.log('Cookies initialized for AmulApi instance')

  const records = await amulApi.searchPincode(pincode)
  // console.log(`Found records for pincode ${pincode}:`, records)
  if (!records.length) {
    throw new AmulError(
      `No pincode found for ${pincode}`,
      AMUL_ERROR_CODE.PINCODE_NOT_FOUND
    )
  }
  // console.log(`Setting pincode for AmulApi instance:`, records[0])
  const record = records[0]
  // console.log(
  //   `Setting pincode: ${record.pincode}, substore: ${record.substore}`
  // )
  await amulApi.setPincode(record)
  // console.log(
  //   `Pincode set successfully for AmulApi instance: ${record.pincode}, substore: ${record.substore}`
  // )
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
