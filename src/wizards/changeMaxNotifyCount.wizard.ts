import { settingsCommand } from '@/commands/settings.command'
import ProductModel from '@/models/product.model'
import { MyContext } from '@/types/context.types'
import { Scenes } from 'telegraf'

export const changeMaxNotifyCountWizard = new Scenes.WizardScene<MyContext>(
  'change-max-notify-count',
  async (ctx) => {
    await ctx.reply(
      'Please enter the new maximum notification count for product updates.'
    )
    return ctx.wizard.next()
  },
  async (ctx) => {
    const hasText = ctx.message && 'text' in ctx.message
    if (!ctx.message || !hasText) {
      await ctx.reply('Invalid input. Please enter a valid number.')
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    const newCount = parseInt(ctx.message.text, 10)
    if (isNaN(newCount) || newCount < 0) {
      await ctx.reply('Invalid number. Please enter a valid positive integer.')
      return ctx.wizard.selectStep(0) // Go back to the first step
    }
    if (newCount > 100) {
      await ctx.reply(
        'Maximum notification count cannot exceed 100. Please enter a valid number.'
      )
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    console.log(ctx.user)

    ctx.user.settings.maxNotifyCount = newCount
    await ctx.user.save()
    await ctx.reply(
      `Maximum notification count updated to ${newCount}. You will now receive max ${newCount} updates for the tracked products.`
    )

    await ProductModel.updateMany(
      {
        trackedBy: ctx.user._id
      },
      {
        $set: {
          remainingNotifyCount: newCount
        }
      }
    )

    await settingsCommand(ctx, async () => {})
    return ctx.scene.leave() // Exit the wizard
  }
)
