import amulService from '@/services/amul.service'
import { CommandContext } from '@/types/context.types'
import {
  getInventoryQuantity,
  getProductUrl,
  isAvailableToPurchase
} from '@/utils/amul.util'
import { emojis } from '@/utils/emoji.util'
import { startCommandLink } from '@/utils/telegram.util'
import { MiddlewareFn } from 'telegraf'

export const productsCommand: MiddlewareFn<CommandContext> = async (ctx) => {
  const products = await amulService.getProteinProducts()
  //   console.log('Products:', products)

  const message: string = [
    `<b>Amul Protein Products</b>`,

    ...(await Promise.all(
      products.map(async (product, index) => {
        const isAvlblToPurchase = isAvailableToPurchase(product)

        // const trackBtn = link('[Track]', getProductUrl(product))

        const trackBtn = `<b><a href="${await startCommandLink(
          `track_${product.sku}`
        )}">[Track]</a></b>`

        const untrackBtn = `<b><a href="${await startCommandLink(
          `untrack_${product.sku}`
        )}">[Untrack]</a></b>`

        const isTracked = ctx.trackedProducts.some((p) => p.sku === product.sku)
        console.log('isTracked:', isTracked)

        return [
          `${index + 1}. <a href="${getProductUrl(product)}">${
            product.name
          }</a>`,
          `Price: <b>${product.price}</b>`,
          `In Stock: <b>${
            isAvlblToPurchase ? `Yes ${emojis.greenDot}` : `No ${emojis.redDot}`
          }</b>`,
          `Available Quantity: <b>${getInventoryQuantity(product)}</b>`,
          isTracked ? untrackBtn : !isAvlblToPurchase ? null : trackBtn
        ]
          .filter(Boolean)
          .join('\n')
      })
    ))
  ].join('\n\n')

  await ctx.reply(message, {
    parse_mode: 'HTML',
    link_preview_options: {
      is_disabled: true
    }
  })
  console.log('ctx.trackedProducts:', ctx.trackedProducts)
}
