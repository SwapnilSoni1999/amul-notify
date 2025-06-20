import { AmulProduct } from '@/types/amul.types'
import { emojis } from './emoji.util'
import { getInventoryQuantity, getProductUrl } from './amul.util'

export const emptySpace = (count: number): string => {
  return ' '.repeat(count)
}

export const formatProductDetails = (
  product: AmulProduct,
  isAvlblToPurchase: boolean,
  index: number
) => {
  return [
    `${index + 1}. <a href="${getProductUrl(product)}">${product.name}</a>`,
    `${emptySpace(5)}Price: <b>${product.price}</b>`,
    `${emptySpace(5)}In Stock: <b>${
      isAvlblToPurchase ? `Yes ${emojis.greenDot}` : `No ${emojis.redDot}`
    }</b>`,
    `${emptySpace(5)}Available Quantity: <b>${getInventoryQuantity(
      product
    )}</b>`
  ].join('\n')
}
