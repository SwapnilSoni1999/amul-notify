import ProductModel from '@/models/product.model'
import { MyContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'

export const untrackProduct = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOneAndDelete({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await ctx.amul.getProteinProducts()
  const product = products.find((p) => p.sku === sku)

  if (!existingProduct) {
    return ctx.reply(
      `${emojis.crossMark} You are not tracking the product: <b>${product?.name}</b>`,
      { parse_mode: 'HTML' }
    )
  }
  ctx.trackedProducts = ctx.trackedProducts.filter((p) => p.sku !== sku)

  const trackType = existingProduct.trackAlways ? 'Always Tracking' : 'Tracking'
  return ctx.reply(
    `${emojis.search} <b>Untracking product: ${product?.name}</b>\n` +
      `You will no longer receive updates for this product. (Previously: ${trackType})`,
    { parse_mode: 'HTML' }
  )
}

export const trackProduct = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOne({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await ctx.amul.getProteinProducts()
  const product = products.find((p) => p.sku === sku)!

  if (existingProduct) {
    const trackType = existingProduct.trackAlways ? 'Always Tracking' : 'Tracking'
    return ctx.reply(
      `${emojis.checkMark} You are already tracking the product: <b>${product?.name}</b> (${trackType})`,
      { parse_mode: 'HTML' }
    )
  }

  const newProduct = await ProductModel.create({
    sku,
    trackedBy: ctx.user._id,
    trackAlways: false
  })

  ctx.trackedProducts.push(newProduct)

  return ctx.reply(
    `${emojis.search} <b>Tracking product: ${product.name}</b>\n` +
      `You will receive a notification when the product becomes available. The product will be untracked after notification.`,
    { parse_mode: 'HTML' }
  )
}

export const trackProductAlways = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOne({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await ctx.amul.getProteinProducts()
  const product = products.find((p) => p.sku === sku)!

  if (existingProduct) {
    if (existingProduct.trackAlways) {
      return ctx.reply(
        `${emojis.checkMark} You are already tracking this product always: <b>${product?.name}</b>`,
        { parse_mode: 'HTML' }
      )
    } else {
      // Update existing regular tracking to always tracking
      await ProductModel.findOneAndUpdate(
        { _id: existingProduct._id },
        { trackAlways: true }
      )
      
      // Update in context as well
      const contextProduct = ctx.trackedProducts.find(p => p.sku === sku)
      if (contextProduct) {
        contextProduct.trackAlways = true
      }

      return ctx.reply(
        `${emojis.repeat} <b>Updated to Always Track: ${product.name}</b>\n` +
          `You will receive notifications every time the product becomes available.`,
        { parse_mode: 'HTML' }
      )
    }
  }

  const newProduct = await ProductModel.create({
    sku,
    trackedBy: ctx.user._id,
    trackAlways: true
  })

  ctx.trackedProducts.push(newProduct)

  return ctx.reply(
    `${emojis.repeat} <b>Always Tracking product: ${product.name}</b>\n` +
      `You will receive notifications every time the product becomes available.`,
    { parse_mode: 'HTML' }
  )
}

export const toggleTrackAlways = async (ctx: MyContext, sku: string) => {
  const existingProduct = await ProductModel.findOne({
    sku,
    trackedBy: ctx.user._id
  })

  const products = await ctx.amul.getProteinProducts()
  const product = products.find((p) => p.sku === sku)!

  if (!existingProduct) {
    return ctx.reply(
      `${emojis.crossMark} You are not tracking the product: <b>${product?.name}</b>`,
      { parse_mode: 'HTML' }
    )
  }

  const newTrackAlways = !existingProduct.trackAlways
  await ProductModel.findOneAndUpdate(
    { _id: existingProduct._id },
    { trackAlways: newTrackAlways }
  )

  // Update in context as well
  const contextProduct = ctx.trackedProducts.find(p => p.sku === sku)
  if (contextProduct) {
    contextProduct.trackAlways = newTrackAlways
  }

  const trackType = newTrackAlways ? 'Always Tracking' : 'Regular Tracking'
  const emoji = newTrackAlways ? emojis.repeat : emojis.search

  return ctx.reply(
    `${emoji} <b>Updated to ${trackType}: ${product.name}</b>\n` +
      `${newTrackAlways ? 'You will receive notifications every time the product becomes available.' : 'You will receive a notification when the product becomes available, then it will be untracked.'}`,
    { parse_mode: 'HTML' }
  )
}
