import { AmulProduct } from '@/types/amul.types'
import { emojis } from './emoji.util'
import { getInventoryQuantity, getProductUrl } from './amul.util'
import dayjs from '@/libs/dayjs.lib'
import { TIMEZONE } from '@/config'

type Nullish<T> = T | undefined | null

interface ProductDetailsFormatOptions {
  firstSeenInStockAt?: Date | NativeDate | Nullish<string>
  lastSeenInStockAt?: Date | NativeDate | Nullish<string>
  lastSeenOutOfStockAt?: Date | NativeDate | Nullish<string>
  remainingNotifyCount?: number
  pincode?: Nullish<string>
  substore?: Nullish<string>
  showProtein?: boolean
}

export const emptySpace = (count: number): string => {
  return ' '.repeat(count)
}

export const formatProductDetails = (
  product: AmulProduct,
  isAvlblToPurchase: boolean,
  index: number,
  options: ProductDetailsFormatOptions = {}
) => {
  const {
    firstSeenInStockAt,
    lastSeenInStockAt,
    lastSeenOutOfStockAt,
    remainingNotifyCount,
    pincode,
    substore,
    showProtein = true
  } = options
  const proteinRegex =
    /<li>[^<]*?(\d+(?:\.\d+)?)(?:\s*(g|kg|mg|%))?[^<]*?\b[Pp]rotein\b.*?<\/li>/g

  let protein =
    product.metafields?.benefits
      ?.match(proteinRegex)?.[0]
      ?.replace('<li>', '')
      ?.replace('</li>', '')
      ?.replace('&nbsp;', '') || 'N/A'

  if (protein === 'N/A') {
    const fallbackSku = ['BTMCP11_30']
    if (fallbackSku.includes(product.sku)) {
      protein = '15g protein'
    }
  }

  // how long the product lasted in stock duration (dynamic unit: days, hours, minutes)
  const inStockDuration =
    firstSeenInStockAt && lastSeenOutOfStockAt
      ? dayjs(firstSeenInStockAt).from(lastSeenOutOfStockAt, true)
      : null

  return [
    `${+index + 1}. <b><a href="${getProductUrl(product)}">${
      product.name
    }</a></b>`,
    showProtein ? `${emptySpace(5)}Protein: <b>${protein}</b>` : null,
    `${emptySpace(5)}Price: <b>${product.price}₹</b>`,
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
    lastSeenOutOfStockAt
      ? `${emptySpace(5)}Last Out of Stock: <b>${dayjs(lastSeenOutOfStockAt)
          .tz(TIMEZONE)
          .fromNow()} | ${dayjs(lastSeenOutOfStockAt)
          .tz(TIMEZONE)
          .format('DD-MM-YYYY, hh:mm A')}</b>`
      : null,
    inStockDuration !== null
      ? `${emptySpace(5)}In Stock Duration: <b>${inStockDuration}</b>`
      : null,
    remainingNotifyCount || remainingNotifyCount === 0
      ? `${emptySpace(
          5
        )}Remaining Notifications: <b>${remainingNotifyCount}</b>`
      : null,
    `${emptySpace(5)}Available Quantity: <b>${getInventoryQuantity(
      product
    )}</b>`,
    pincode ? `${emptySpace(5)}Pincode: <b>${pincode}</b>` : null,
    substore ? `${emptySpace(5)}Substore: <b>${substore}</b>` : null
  ]
    .filter(Boolean)
    .join('\n')
}
