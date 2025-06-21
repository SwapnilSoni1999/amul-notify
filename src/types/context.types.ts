import { AmulApi } from '@/libs/amulApi.lib'
import { HydratedProduct } from '@/models/product.model'
import { HydratedUser } from '@/models/user.model'
import { Context, NarrowedContext, Scenes } from 'telegraf'
import { Deunionize } from 'telegraf/typings/core/helpers/deunionize'
import {
  CallbackQuery,
  Message,
  Update
} from 'telegraf/typings/core/types/typegram'
import { CommandContextExtn } from 'telegraf/typings/telegram-types'

export interface MyContext<U extends Deunionize<Update> = Update>
  extends Context<U> {
  user: HydratedUser
  amul: AmulApi
  trackedProducts: HydratedProduct[]
  scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>
  // declare wizard type
  wizard: Scenes.WizardContextWizard<MyContext>
}

export type CommandContext = MyContext<{
  message: Update.New & Update.NonChannel & Message.TextMessage
  update_id: number
}> &
  Omit<MyContext<Update>, keyof MyContext<Update>> &
  CommandContextExtn

export type ActionContext = MyContext<
  Update.CallbackQueryUpdate<CallbackQuery>
> &
  Omit<MyContext<Update>, keyof MyContext<Update>> & {
    match: RegExpExecArray
  }

export type CallbackQueryContext = NarrowedContext<
  MyContext<Update>,
  Update.CallbackQueryUpdate<CallbackQuery>
>
