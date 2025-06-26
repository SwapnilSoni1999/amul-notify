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

  // split messages into chunks of 4096 characters
  const chunks: string[] = []
  let currentChunk = ''
  for (const message of messages) {
    if (currentChunk.length + message.length > 4096) {
      chunks.push(currentChunk)
      currentChunk = ''
    }
    currentChunk += message + '\n\n'
  }
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  // send each chunk
  for (const chunk of chunks) {
    await ctx.replyWithHTML(chunk, {
      link_preview_options: {
        is_disabled: true
      },
      parse_mode: 'HTML'
    })
  }
  return next()
}
