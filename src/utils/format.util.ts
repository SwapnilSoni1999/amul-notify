import { AmulProduct } from '@/types/amul.types'
import { emojis } from './emoji.util'
import { getInventoryQuantity, getProductUrl } from './amul.util'
import dayjs from '@/libs/dayjs.lib'
import { TIMEZONE } from '@/config'

export const emptySpace = (count: number): string => {
  return ' '.repeat(count)
}

export const formatProductDetails = (
  product: AmulProduct,
  isAvlblToPurchase: boolean,
  index: number,
  lastSeenInStockAt?: Date
) => {
  return [
    `${index + 1}. <a href="${getProductUrl(product)}">${product.name}</a>`,
    `${emptySpace(5)}Price: <b>${product.price}</b>`,
    `${emptySpace(5)}In Stock: <b>${
      isAvlblToPurchase ? `Yes ${emojis.greenDot}` : `No ${emojis.redDot}`
    }</b>`,
    lastSeenInStockAt
      ? `${emptySpace(5)}Last InStock: <b>${dayjs(lastSeenInStockAt)
          .tz(TIMEZONE)
          .fromNow()} | ${dayjs(lastSeenInStockAt)
          .tz(TIMEZONE)
          .format('DD-MM-YYYY, hh:mm A')}</b>`
      : null,
    `${emptySpace(5)}Available Quantity: <b>${getInventoryQuantity(
      product
    )}</b>`
  ]
    .filter(Boolean)
    .join('\n')
}
