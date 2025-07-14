import UserModel from '@/models/user.model'
import { sendMessageQueue } from '@/queues/broadcast.queue'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

export const broadcastMessage = async (
  text: string,
  onProgress: (completed: number, total: number, failed: number) => void,
  extra?: ExtraReplyMessage
) => {
  const pageSize = 100

  const totalUsers = await UserModel.countDocuments({
    isBlocked: false
  })

  const totalPages = Math.ceil(totalUsers / pageSize)

  let completed = 0
  let failed = 0

  for (let page = 1; page <= totalPages; page++) {
    const users = await UserModel.find(
      { isBlocked: false },
      { tgId: 1, tgUsername: 1 }
    )
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    for (const user of users) {
      try {
        if (user.tgId) {
          sendMessageQueue({
            chatId: user.tgId,
            text,
            extra,
            onComplete: async (err) => {
              if (err) {
                console.error(
                  `Failed to send message to ${user.tgUsername}:`,
                  err
                )
                failed++
              }

              completed++

              onProgress(completed, totalUsers, failed)
              if (completed + failed >= totalUsers) {
                console.log('Broadcast completed:', {
                  total: totalUsers,
                  completed,
                  failed
                })
              }
            }
          })
        }
      } catch (error) {
        console.error(`Failed to send message to ${user.tgUsername}:`, error)
      }
    }
  }
}
