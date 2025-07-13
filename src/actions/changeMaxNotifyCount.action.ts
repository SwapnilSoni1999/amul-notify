import { ActionContext } from '@/types/context.types'
import { MiddlewareFn } from 'telegraf'

export const changeMaxNotifyCount: MiddlewareFn<ActionContext> = async (
  ctx
) => {
  await ctx.answerCbQuery(`Updating max notify count`)
  return ctx.scene.enter('change-max-notify-count')
}
