// -------------- Products
export interface AmulProduct {
  _id: string
  name: string
  alias: string
  brand: string
  sku: string
  price: number
  compare_price: number
  original_price: number
  available: number
  inventory_quantity: number
  net_quantity?: string
  catalog_only: boolean
  is_catalog: boolean
  avg_rating: number
  num_reviews: number
  inventory_low_stock_quantity: number
  inventory_allow_out_of_stock?: string
  default_variant?: string
  lp_seller_ids?: string[]
  seller?: Seller
  categories?: string[]
  collections?: string[]
  discounts?: any[]
  variants?: Variant[]
  metafields?: Metafields
  images: ProductImage[]
}

export interface Seller {
  _id: string
  name: string
}

export interface Variant {
  _id: string
  name: string
  alias: string
  price: number
  available: number
  inventory_quantity: number
}

export interface ProductImage {
  image: string
  position: number
}

export interface Metafields {
  uom?: string
  weight?: string
  shot_description?: string
  product_type?: string
  benefits?: string
  how_to_useit?: string
  ingredients?: string
}

export interface AmulProductsResponse {
  data: AmulProduct[]
  total: number
  start: number
  limit: number
  fileBaseUrl: string
  facets: any // optional: define if needed
  facetCounts: any // optional: define if needed
}

// -------------- Products
