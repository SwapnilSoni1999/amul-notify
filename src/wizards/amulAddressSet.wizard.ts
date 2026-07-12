import { autoOrderCommand } from '@/commands/autoorder.command'
import {
  AmulAutoOrder,
  isAmulSessionAuthenticationError
} from '@/libs/autoOrder.lib'
import { MyContext } from '@/types/context.types'
import { AddressRecord } from '@/types/orderApi.types'
import { isAutoOrderConfigured, isLoggedIn } from '@/utils/autoOrder.util'
import { clearUserAmulSession, replaceUserCookies } from '@/utils/cookie.util'
import { Markup, Scenes } from 'telegraf'
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram'

interface ContextState {
  addresses: AddressRecord[]
}

export const amulAddressSetWizard = new Scenes.WizardScene<MyContext>(
  'amul-set-address',
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
    if (!isAutoOrderConfigured()) {
      await ctx.reply('Auto-ordering is not configured for this bot.')
      return ctx.scene.leave()
    }

    // show button keyboard if phone number exists in database
    const loggedIn = isLoggedIn(ctx.user)
    if (!loggedIn) {
      await ctx.reply('Please log in first from /autoorder')
      return ctx.scene.leave()
    }

    const isEnabled = ctx.user.orderSettings.enabled
    if (!isEnabled) {
      await ctx.reply('Please enable auto-ordering first from /autoorder')
      return ctx.scene.leave()
    }

    const amulOrderApi = new AmulAutoOrder(ctx.amul, ctx.user.cookies)

    let response
    try {
      response = await amulOrderApi.fetchAddresses()
    } catch (err) {
      if (isAmulSessionAuthenticationError(err)) {
        clearUserAmulSession(ctx.user)
        await ctx.user.save()
        await ctx.reply(
          'Your Amul session has expired. Please log in again from /autoorder.'
        )
        return ctx.scene.leave()
      }
      console.error('Error fetching addresses:', err)
      await ctx.reply('Error fetching addresses. Please try again later.')
      return ctx.scene.leave()
    }

    // Replace the persisted snapshot with the latest server cookie state.
    replaceUserCookies(ctx.user, response.cookieExpiry)
    await ctx.user.save()

    console.dir(response, { depth: null })

    const addresses = response.addresses
    if (addresses.length === 0) {
      await ctx.reply(
        'No addresses found in your Amul account. Please visit https://shop.amul.com and add an address to use this feature.'
      )
      return ctx.scene.leave()
    }

    ;(ctx.scene.state as ContextState).addresses = addresses

    const buttons: InlineKeyboardButton.CallbackButton[] = []

    const addressOptions = addresses.map((address, index) => {
      const optionText = [
        `${index + 1}.`,
        `${address.full_name}`,
        `${address.address}`,
        `${address.city}`,
        `${address.state}`,
        `${address.zip}`,
        `${address.phone}`
      ].join(' ')
      buttons.push(
        Markup.button.callback(`${index + 1}`, `select_address_${index}`)
      )

      return optionText
    })

    await ctx.reply(
      [
        'Please select the address you want to use for auto-ordering:',
        '',
        ...addressOptions,

        '',
        'send the command /cancel to cancel the address selection process'
      ].join('\n'),
      Markup.inlineKeyboard(buttons, {
        columns: Math.max(buttons.length, 3) // Show all buttons in one row if less than 3, otherwise 3 per row
      })
    )

    return ctx.wizard.next()
  }
)

amulAddressSetWizard.use((ctx, next) => {
  if (!ctx.user.orderSettings.permitted) {
    return ctx.reply('You do not have permission to use this feature.')
  }
  return next()
})

amulAddressSetWizard.action(/select_address_(\d+)/, async (ctx) => {
  const index = parseInt(ctx.match[1], 10)
  const state = ctx.scene.state as ContextState
  const address = state.addresses[index]

  if (!address) {
    await ctx.reply('Invalid address selection. Please try again.')
    return
  }

  // Save selected address to user profile in database
  ctx.user.set('address', { ...address, amulId: address._id })
  await ctx.user.save()

  const amulOrderApi = new AmulAutoOrder(ctx.amul, ctx.user.cookies)
  let response
  try {
    response = await amulOrderApi.setAddress(address._id, ctx.user.amulCartId!)
  } catch (err) {
    if (isAmulSessionAuthenticationError(err)) {
      clearUserAmulSession(ctx.user)
      await ctx.user.save()
      await ctx.reply(
        'Your Amul session has expired. Please log in again from /autoorder.'
      )
      return ctx.scene.leave()
    }
    console.error('Error setting address:', err)
    await ctx.reply('Error setting address. Please try again later.')
    return ctx.scene.leave()
  }

  // Replace the persisted snapshot with the latest server cookie state.
  replaceUserCookies(ctx.user, response.cookieExpiry)
  await ctx.user.save()

  console.dir(response, { depth: null })

  await ctx.answerCbQuery() // Acknowledge the callback query to remove loading state
  await ctx.scene.leave()
  await ctx.reply(
    `Address "${ctx.user.get('address')?.address}" has been set for auto-ordering.`
  )
  return autoOrderCommand(ctx, () => Promise.resolve()) // to refresh auto-order overview
})

amulAddressSetWizard.command('cancel', async (ctx) => {
  await ctx.reply('Address selection cancelled.')
  await ctx.scene.leave()
  return autoOrderCommand(ctx, () => Promise.resolve()) // to refresh auto-order overview
})
