import bot from '@/bot'

const TELEGRAM_MESSAGE_LIMIT = 4096

export const startCommandLink = async (payload: string): Promise<string> => {
  const info = bot.botInfo || (await bot.telegram.getMe())

  return `https://t.me/${info.username}?start=${payload}`
}

export const chunkTextBlocks = (
  blocks: string[],
  opts?: {
    separator?: string
    maxLength?: number
  }
): string[] => {
  const separator = opts?.separator ?? '\n\n'
  const maxLength = opts?.maxLength ?? TELEGRAM_MESSAGE_LIMIT
  const chunks: string[] = []
  let currentChunk = ''

  for (const block of blocks) {
    const nextChunk = currentChunk
      ? `${currentChunk}${separator}${block}`
      : block

    if (currentChunk && nextChunk.length > maxLength) {
      chunks.push(currentChunk)
      currentChunk = block
      continue
    }

    currentChunk = nextChunk
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

export const safeDeleteMessage = async (
  ctx: {
    deleteMessage: (messageId?: number) => Promise<unknown>
  },
  messageId?: number
) => {
  await ctx.deleteMessage(messageId).catch(() => {
    // ignore if the message cannot be deleted
  })
}
