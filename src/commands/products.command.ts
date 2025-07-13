import { getLastInStockAt } from '@/services/amul.service'
import { CommandContext } from '@/types/context.types'
import { isAvailableToPurchase } from '@/utils/amul.util'
import { formatProductDetails } from '@/utils/format.util'
import { startCommandLink } from '@/utils/telegram.util'
import { MiddlewareFn } from 'telegraf'

export const productsCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const query = ctx.payload

  const waitMsg = await ctx.reply(`Fetching from Amul... Please wait...`)

  const products = await ctx.amul.getProteinProducts({
    search: query
  })
  //   console.log('Products:', products)

  const title = `<b>Amul Protein Products</b> (${ctx.amul.getPincode()} - ${ctx.amul.getSubstore()})`

  const messages: string[][] = []

  const productMessageBlocks = await Promise.all(
    products.map(async (product, index) => {
      const isAvlblToPurchase = isAvailableToPurchase(product)

      // const trackBtn = link('[Track]', getProductUrl(product))

      const trackBtn = `<b><a href="${await startCommandLink(
        `track_${product.sku}`
      )}">[Track]</a></b>`

      const untrackBtn = `<b><a href="${await startCommandLink(
        `untrack_${product.sku}`
      )}">[Untrack]</a></b>`

      const isFav = ctx.user.favSkus.includes(product.sku)

      const favBtn = `<b><a href="${await startCommandLink(
        `fav_${product.sku}`
      )}">${isFav ? '[Unfavourite]' : '[Favourite]'}</a></b>`

      const isTracked = ctx.trackedProducts.some((p) => p.sku === product.sku)

      const lastSeen = await getLastInStockAt(
        product.sku,
        ctx.amul.getSubstore()!
      )

      const productMessage = [
        formatProductDetails(
          product,
          isAvlblToPurchase,
          index,
          lastSeen?.lastSeenInStockAt
        ),
        `${isTracked ? untrackBtn : trackBtn} | ${favBtn}`
      ]
        .filter(Boolean)
        .join('\n')

      return productMessage
    })
  )

  // console.log('Product Message Blocks:', productMessageBlocks)

  let currentChunk: string[] = []
  for (const block of productMessageBlocks) {
    if (currentChunk.join('\n\n').length + block.length > 4096) {
      messages.push(currentChunk)
      currentChunk = []
    }

    currentChunk.push(block)
  }

  if (currentChunk.length > 0) {
    // console.log('Pushing last chunk:', currentChunk.length)
    messages.push(currentChunk)
  }

  // console.log('Messages:', messages)

  await ctx.deleteMessage(waitMsg.message_id).catch(() => {
    // ignore if message is not found
  })

  for (let i = 0; i < messages.length; i++) {
    const chunk = messages[i]
    if (i === 0) {
      // attach title only to the first message
      chunk.unshift(title)
    }

    await ctx.reply(chunk.join('\n\n'), {
      parse_mode: 'HTML',
      link_preview_options: {
        is_disabled: true
      }
    })
  }

  // await ctx.reply(message, {
  //   parse_mode: 'HTML',
  //   link_preview_options: {
  //     is_disabled: true
  //   }
  // })

  next()
}
