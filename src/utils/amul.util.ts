import { AmulProduct } from '@/types/amul.types'

/**
 * Product is available to purchase if:
 * 1. The product allows out of stock purchases.
 * 2. The product's inventory quantity is greater than or equal to the low stock quantity
 *    and the product is available (available > 0).
 *
 */
export const isAvailableToPurchase = (product: AmulProduct): boolean => {
  if ((product.inventory_allow_out_of_stock || '0') !== '0') {
    return true
  }

  if (product.available <= 0) {
    return false
  }

  return product.inventory_quantity >= product.inventory_low_stock_quantity
}

/**
 * We're doing this because when api doesn't allow out of stock purchases,
 * and if the inventory quantity is less than the low stock quantity,
 * we consider the product as out of stock.
 */
export const getInventoryQuantity = (product: AmulProduct): number => {
  if (
    product.inventory_low_stock_quantity > product.inventory_quantity &&
    (product.inventory_allow_out_of_stock || '0') === '0'
  ) {
    return 0
  }
  return product.inventory_quantity < 0
    ? 0
    : product.inventory_quantity - product.inventory_low_stock_quantity
}

export const getProductUrl = (product: AmulProduct): string => {
  return `https://shop.amul.com/en/product/${product.alias}`
}
