import { randomUUID } from 'crypto'

export const createSendMessageOperationId = (): string => {
  return randomUUID()
}

export const getSendMessageJobId = (
  chatId: string | number,
  operationId = createSendMessageOperationId()
): string => {
  return `${operationId}-${chatId}`
}
