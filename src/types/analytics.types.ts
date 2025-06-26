export interface SubstoreSkuCount {
  substore: string
  total: number
  skus: {
    sku: string
    count: number
  }[]
}
