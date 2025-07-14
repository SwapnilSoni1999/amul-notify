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
  lastSeenInStockAt?: Date,
  remainingNotifyCount?: number
) => {
  const proteinRegex =
    /<li>[^<]*?(\d+(?:\.\d+)?)(?:\s*(g|kg|mg|%))?[^<]*?\b[Pp]rotein\b.*?<\/li>/g

  let protein =
    product.metafields?.benefits
      ?.match(proteinRegex)?.[0]
      ?.replace('<li>', '')
      .replace('</li>', '') || 'N/A'

  if (protein === 'N/A') {
    const fallbackSku = ['BTMCP11_30']
    if (fallbackSku.includes(product.sku)) {
      protein = '15g protein'
    }
  }

  return [
    `${+index + 1}. <b><a href="${getProductUrl(product)}">${
      product.name
    }</a></b>`,
    `${emptySpace(5)}Protein: <b>${protein}</b>`,
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
    remainingNotifyCount || remainingNotifyCount === 0
      ? `${emptySpace(
          5
        )}Remaining Notifications: <b>${remainingNotifyCount}</b>`
      : null,
    `${emptySpace(5)}Available Quantity: <b>${getInventoryQuantity(
      product
    )}</b>`
  ]
    .filter(Boolean)
    .join('\n')
}
