import { getAmulApiFromSubstore } from '@/services/amul.service'
import { getSkusWithSubstoresCountSorted } from '@/services/analytics.service'
import { CommandContext } from '@/types/context.types'
import { emojis } from '@/utils/emoji.util'
import { MiddlewareFn } from 'telegraf'

export const analyticsCommand: MiddlewareFn<CommandContext> = async (
  ctx,
  next
) => {
  const details = await getSkusWithSubstoresCountSorted()

  if (!details.length) {
    await ctx.reply('No products found in the database.')
    return next()
  }

  const mappedMessage = details.map(async (item) => {
    const header = `${emojis.pin} <b>${item.substore}</b> (${item.total})\n`

    const amulApi = await getAmulApiFromSubstore(item.substore)
    if (!amulApi) {
      return [header, 'No active session found for this substore.'].join('')
    }

    const products = await amulApi.getProteinProducts()

    const skusList = item.skus.map((sku) => {
      const product = products.find((product) => product.sku === sku.sku)
      const productName = product ? product.name : sku.sku
      return `- <b>${productName}</b> (${sku.count})`
    })

    return [header, skusList.join('\n')].join('')
  })

  const messages = await Promise.all(mappedMessage)

  await ctx.reply(messages.join('\n\n'), { parse_mode: 'HTML' })
  next()
}
