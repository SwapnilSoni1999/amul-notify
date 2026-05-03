import { AmulAutoOrder } from '@/libs/autoOrder.lib'
import { MyContext } from '@/types/context.types'
import { Markup, Scenes } from 'telegraf'
import { keyboard } from 'telegraf/markup'

export const amulLoginWizard = new Scenes.WizardScene<MyContext>(
  'amul-login',
  /**
   * Step 1: ask for phone number
   *    Validate phone number (without country code)
   * Step 2: ask for otp
   *    Validate otp
   *    Send otp
   *    Verify otp
   *    Save user
   */
  async (ctx) => {
    // show button keyboard if phone number exists in database
    let kb: ReturnType<typeof keyboard> | undefined
    if (ctx.user.phone) {
      kb = keyboard([Markup.button.text(`${ctx.user.phone}`, true)])
      kb.oneTime(true)
    }

    await ctx.reply(
      'Please enter your phone number and we will send you an OTP to verify your phone number.',
      { reply_markup: kb?.reply_markup }
    )
    return ctx.wizard.next()
  },
  async (ctx) => {
    const hasText = ctx.message && 'text' in ctx.message
    if (!ctx.message || !hasText) {
      await ctx.reply('Invalid input. Please enter a valid number.')
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    const phone = ctx.message.text

    if (phone.length !== 10) {
      await ctx.reply(
        'Invalid phone number. Please enter a valid 10 digit number.'
      )
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    if (!phone.match(/^\d{10}$/)) {
      await ctx.reply(
        'Invalid phone number. Please enter a valid 10 digit number.'
      )
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    const amulOrderApi = new AmulAutoOrder(ctx.amul)
    const response = await amulOrderApi.sendOtp(phone).catch((err) => {
      console.error('Error sending OTP:', err)
      return
    })

    if (!response) {
      await ctx.reply('Error sending OTP. Please try again later.')
      return ctx.wizard.selectStep(0) // Go back to the first step
    }
    console.dir(response, { depth: null })

    ctx.user.phone = phone
    ctx.user.cookies.push(...response.cookieExpiry)
    await ctx.user.save()

    await ctx.reply('Please enter the OTP sent to your phone.')
    return ctx.wizard.next()
  },
  async (ctx) => {
    const hasText = ctx.message && 'text' in ctx.message
    if (!ctx.message || !hasText) {
      await ctx.reply('Invalid input. Please enter a valid number.')
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    const otp = ctx.message.text
    const phone = ctx.user.phone
    if (!otp.match(/^\d{6}$/)) {
      await ctx.reply('Invalid OTP. Please enter a valid 6 digit number.')
      return ctx.wizard.selectStep(0) // Go back to the first step
    }
    if (!phone) {
      await ctx.reply(
        'Please enter your phone number before verifying your OTP.'
      )
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    const msg = await ctx.reply('Verifying OTP...')

    const amulOrderApi = new AmulAutoOrder(ctx.amul)
    const response = await amulOrderApi.verifyOtp(phone, otp).catch((err) => {
      console.error('Error verifying OTP:', err)
      return
    })

    if (!response) {
      await ctx.reply('Error verifying OTP. Please try again later.')
      return ctx.wizard.selectStep(0) // Go back to the first step
    }

    console.dir(response, { depth: null })

    // empty cookies
    ctx.user.cookies.splice(0, ctx.user.cookies.length)
    ctx.user.cookies.push(...response.cookieExpiry)
    ctx.user.amulCartId = response.cartId
    ctx.user.amulUserId = response.userId
    await ctx.user.save()

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `Successfully verified OTP. You are now logged in to the Amul Auto Order feature.`
    )

    return ctx.scene.leave()
  }
)

amulLoginWizard.use((ctx, next) => {
  if (!ctx.user.orderSettings.permitted) {
    return ctx.reply('You do not have permission to use this feature.')
  }
  return next()
})
