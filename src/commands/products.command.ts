import { ACTIONS, AMUL_PRODUCT_CATEGORIES, AmulProductCategory } from '@/config'
import { ActionContext, CommandContext } from '@/types/context.types'
import { escapeHtml } from '@/utils/html.util'
import { renderProductListItem } from '@/utils/productMessage.util'
import { chunkTextBlocks, safeDeleteMessage } from '@/utils/telegram.util'
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

  const productMessageBlocks = await Promise.all(
    products.map((product, index) =>
      renderProductListItem(ctx, product, {
        index,
        showProtein: category?.id === 'protein'
      })
    )
  )

  await safeDeleteMessage(ctx, waitMsg.message_id)

  if (!productMessageBlocks.length) {
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

  const messages = chunkTextBlocks([title, ...productMessageBlocks])

  for (let i = 0; i < messages.length; i++) {
    await ctx.reply(messages[i], {
      parse_mode: 'HTML',
      link_preview_options: {
        is_disabled: true
      }
    })
  }
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
