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
  last_order_date: string
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

// -------------- Pincode
export interface AmulPincodeResponse {
  limit: number
  start: number
  records: PincodeRecord[]
  count: number
  total: number
}

export interface PincodeRecord {
  _id: string
  pincode: string
  substore: string
  created_on: Date
  _created_by: string
  _size: number
  _updated_by: string
  updated_on: Date
}

// -------------- Pincode

// -------------- Session
export interface AmulSessionInfo {
  data: Data
  user_messages: any[]
  user_settings: UserSettings
  tid: string
  device: Device
  geo_location: GeoLocation
}

export interface Data {
  isBot: boolean
  currency: Currency
  language: string
}

export interface Currency {
  name: string
  conversion_rate: number
  decimal_points: number
  symbol: string
}

export interface Device {
  isPhone: boolean
  isTablet: boolean
  isMobile: boolean
  isBot: boolean
  isAndroid: boolean
  isIphone: boolean
  isIpad: boolean
  isMobileApp: boolean
  isFacebookStore: boolean
  mobile_app_id: boolean
  mobile_uuid: boolean
  type: string
}

export interface Sources {
  ip: GeoLocation
}

export interface GeoLocation {
  country: string
  time: number
  state: string
  region: string
  city: string
  postal_code: string
  zip_code: string
  longitude: string
  latitude: string
  timezone: string
  source: string
  sources?: Sources
}

export interface UserSettings {
  [key: string]: any
}

// -------------- Session
