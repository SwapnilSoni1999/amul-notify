import { AmulProduct, AmulProductsResponse } from '@/types/amul.types'
import axios from 'axios'
import cacheService from './cache.service'

const getProteinProducts = async (): Promise<AmulProduct[]> => {
  const cachedProducts = await cacheService.products.get()

  if (cachedProducts) {
    return cachedProducts.data
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
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,hi;q=0.8',
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
        tid: '1750419337320:873:72ef26559a33895ccec4eed4abb973879c4d103a2fc958af51fa4ca872b89c80',
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        cookie:
          'jsessionid=s%3AsyjOZWAFo6cF5bkZ%2BRxd8d2C.33mSOHSV0z7loD6f0HmT6HbHolU2CE4Xz2MFfazaq%2Fw; __cf_bm=5wv3zyrFex.JXrWOjwMbEtRfHBNRpCpFmui.3NFhPlI-1750419328-1.0.1.1-LEM.xx25GynvzN2ign7_XJpwiJrGcjmTEy4EbSSy9BvdnHb44oB493XDfIInf3CddgTfcgIEmRjAIhy81ZLbL2nCcKHLhCR8LulvGyCvdco'
      },
      withCredentials: true
    }
  )

  cacheService.products.set(response.data)

  return response.data.data
}

export default {
  getProteinProducts
}
