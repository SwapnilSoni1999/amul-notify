import { ACTIONS, AMUL_PRODUCT_CATEGORIES, AmulProductCategory } from '@/config'
import { getLastInStockAt } from '@/services/amul.service'
import { ActionContext, CommandContext } from '@/types/context.types'
import { isAvailableToPurchase } from '@/utils/amul.util'
import { getAutoOrderButton } from '@/utils/autoOrder.util'
import { formatProductDetails } from '@/utils/format.util'
import { escapeHtml } from '@/utils/html.util'
import { startCommandLink } from '@/utils/telegram.util'
import { MiddlewareFn } from 'telegraf'
import { inlineKeyboard } from 'telegraf/markup'

type ProductListContext = CommandContext | ActionContext

const rememberProductSearchQuery = (
  ctx: ProductListContext,
  messageId: number,
  search: string
) => {
  const productSearchQueries = {
    ...(ctx.session.productSearchQueries ?? {}),
    [messageId]: search
  }

  ctx.session.productSearchQueries = Object.fromEntries(
    Object.entries(productSearchQueries).slice(-10)
  )
}

export const replyWithProductCategoryMenu = async (
  ctx: ProductListContext,
  opts?: {
    search?: string
  }
) => {
  const keyboard = inlineKeyboard(
    AMUL_PRODUCT_CATEGORIES.map((category) => ({
      text: `${category.emoji} ${category.label}`,
      callback_data: `${ACTIONS.products.categoryPrefix}${category.id}`
    })),
    { columns: 2 }
  )

  const menuMessage = await ctx.reply(
    [
      `<b>Amul Products</b> (${ctx.amul.getPincode()} - ${ctx.amul.getSubstore()})`,
      ``,
      opts?.search
        ? `Select a category to search for <b>${escapeHtml(opts.search)}</b>.`
        : `Select a category to view products.`
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    }
  )

  if (opts?.search) {
    rememberProductSearchQuery(ctx, menuMessage.message_id, opts.search)
  }
}

export const replyWithAmulProducts = async (
  ctx: ProductListContext,
  opts?: {
    search?: string
    category?: AmulProductCategory
  }
) => {
  const waitMsg = await ctx.reply(`Fetching from Amul... Please wait...`)
  const category = opts?.category

  const products = await ctx.amul.getAmulProducts({
    bypassCache: false,
    search: opts?.search,
    categories: category ? [category] : undefined
  })
  //   console.log('Products:', products)

  const title = `<b>${
    category
      ? `Amul ${category.emoji} ${category.label} Products`
      : 'Amul Products'
  }</b> (${ctx.amul.getPincode()} - ${ctx.amul.getSubstore()})`

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

      const autoOrderBtn = await getAutoOrderButton(ctx.user, product.sku)

      console.log('Auto Order Button:', autoOrderBtn)

      const lastSeen = await getLastInStockAt(
        product.sku,
        ctx.amul.getSubstore()!
      )

      const productMessage = [
        formatProductDetails(product, isAvlblToPurchase, index, {
          lastSeenInStockAt: lastSeen?.lastSeenInStockAt,
          showProtein: category?.id === 'protein'
        }),
        `${isTracked ? untrackBtn : trackBtn} | ${favBtn}`,
        autoOrderBtn ? `<b>${autoOrderBtn}</b>` : null
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

  if (!messages.length) {
    await ctx.reply(
      [
        title,
        ``,
        opts?.search
          ? `No products found for <b>${opts.search}</b>.`
          : `No products found.`
      ].join('\n'),
      {
        parse_mode: 'HTML'
      }
    )
    return
  }

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
}

export const productsCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const query = ctx.payload?.trim()

  await replyWithProductCategoryMenu(ctx, {
    search: query
  })

  return next()
}
