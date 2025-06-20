import { AmulProduct, AmulProductsResponse } from '@/types/amul.types'
import axios from 'axios'
import cacheService from './cache.service'
// import { v4 as uuidv4 } from 'uuid'
// import crypto from 'crypto'

const randomUserAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Mozilla/5.0 (X11; Linux x86_64)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
]

// ——————————————————
// 1️⃣ Tid generator
// ——————————————————
/**
 * @param storeId    Your ms.store.storeId (e.g. "66505ff06510ee3d5903fd42")
 * @param serverTs   The serverTimestamp value (ideally from a “time” endpoint)
 * @param prevTid    The last session TID (you can persist this per session)
 */
// async function makeTid(
//   storeId: string,
//   serverTs: number,
//   prevTid: string
// ): Promise<string> {
//   // random 0–999
//   const rand = Math.floor(Math.random() * 1000)

//   // compose d = storeId:serverTs:rand:prevTid
//   const d = `${storeId}:${serverTs}:${rand}:${prevTid}`

//   // hash it SHA-256 → hex
//   const hash = crypto.createHash('sha256').update(d).digest('hex')

//   // final tid = serverTs:rand:hash
//   return `${serverTs}:${rand}:${hash}`
// }

const getProteinProducts = async (opts?: {
  bypassCache?: boolean
}): Promise<AmulProduct[]> => {
  const { bypassCache = false } = opts || {}

  const cachedProducts = await cacheService.products.get()

  if (cachedProducts && !bypassCache) {
    return cachedProducts.data
  }

  const headers = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    base_url: 'https://shop.amul.com/en/browse/protein',
    'cache-control': 'no-cache',
    frontend: '1',
    pragma: 'no-cache',
    priority: 'u=1, i',
    referer: 'https://shop.amul.com/',
    'sec-ch-ua': '"Chromium";v="114", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    tid: `1750419337320:873:72ef26559a33895ccec4eed4abb973879c4d103a2fc958af51fa4ca872b89c80`, // TODO: use Tid generator in future
    'user-agent':
      randomUserAgents[Math.floor(Math.random() * randomUserAgents.length)],
    cookie: '' // If you rotate sessions, can be dynamic
  }

  const response = await axios.get<AmulProductsResponse>(
    'https://shop.amul.com/api/1/entity/ms.products',
    {
      params: {
        'fields[name]': 1,
        'fields[brand]': 1,
        'fields[categories]': 1,
        'fields[collections]': 1,
        'fields[alias]': 1,
        'fields[sku]': 1,
        'fields[price]': 1,
        'fields[compare_price]': 1,
        'fields[original_price]': 1,
        'fields[images]': 1,
        'fields[metafields]': 1,
        'fields[discounts]': 1,
        'fields[catalog_only]': 1,
        'fields[is_catalog]': 1,
        'fields[seller]': 1,
        'fields[available]': 1,
        'fields[inventory_quantity]': 1,
        'fields[net_quantity]': 1,
        'fields[num_reviews]': 1,
        'fields[avg_rating]': 1,
        'fields[inventory_low_stock_quantity]': 1,
        'fields[inventory_allow_out_of_stock]': 1,
        'fields[default_variant]': 1,
        'fields[variants]': 1,
        'fields[lp_seller_ids]': 1,
        'filters[0][field]': 'categories',
        'filters[0][value][0]': 'protein',
        'filters[0][operator]': 'in',
        'filters[0][original]': 1,
        facets: true,
        facetgroup: 'default_category_facet',
        limit: 24,
        total: 1,
        start: 0,
        cdc: '1m',
        substore: '66505ff06510ee3d5903fd42'
      },
      headers,
      withCredentials: true
    }
  )

  cacheService.products.set(response.data)

  return response.data.data
}

export default {
  getProteinProducts
}
