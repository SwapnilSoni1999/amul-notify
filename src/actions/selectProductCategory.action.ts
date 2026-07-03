import { replyWithAmulProducts } from '@/commands/products.command'
import { AMUL_PRODUCT_CATEGORIES } from '@/config'
import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

const getCategoryMenuMessageId = (ctx: ActionContext) => {
  const message = ctx.callbackQuery.message

  if (!message || !('message_id' in message)) {
    return undefined
  }

  return message.message_id
}

export const selectProductCategoryAction: MiddlewareFn<ActionContext> = async (
  ctx,
  next
) => {
  const categoryId = ctx.match[1]
  const category = AMUL_PRODUCT_CATEGORIES.find(
    (item) => item.id === categoryId
  )

  if (!category) {
    await ctx.answerCbQuery('Unknown product category')
    return next()
  }

  await ctx.answerCbQuery(`${category.label} products`)
  const menuMessageId = getCategoryMenuMessageId(ctx)
  const search = menuMessageId
    ? ctx.session.productSearchQueries?.[menuMessageId]
    : undefined

  if (menuMessageId && ctx.session.productSearchQueries) {
    delete ctx.session.productSearchQueries[menuMessageId]
  }

  await ctx.deleteMessage().catch(() => {
    // ignore if the menu message cannot be deleted
  })

  await replyWithAmulProducts(ctx, {
    category,
    search
  })

  return next()
}
