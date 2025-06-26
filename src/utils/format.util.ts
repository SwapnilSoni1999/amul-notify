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
  index: number
) => {
  return [
    `${index + 1}. <a href="${getProductUrl(product)}">${product.name}</a>`,
    `${emptySpace(5)}Price: <b>${product.price}</b>`,
    `${emptySpace(5)}In Stock: <b>${
      isAvlblToPurchase ? `Yes ${emojis.greenDot}` : `No ${emojis.redDot}`
    }</b>`,
    `${emptySpace(5)}Last Order: <i>${dayjs(product.last_order_date)
      .tz(TIMEZONE)
      .fromNow()} at ${dayjs(product.last_order_date)
      .tz(TIMEZONE)
      .format('DD-MM-YYYY, hh:mm A')}</i>`,
    `${emptySpace(5)}Available Quantity: <b>${getInventoryQuantity(
      product
    )}</b>`
  ].join('\n')
}
