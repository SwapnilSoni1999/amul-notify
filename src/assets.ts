import { readFileSync } from 'fs'
import path from 'path'

export const getPincodeUnavailableImage = () => {
  const PINCODE_UNAVAILABLE_IMAGE = readFileSync(
    path.join(__dirname, '..', 'assets', 'pincode_unavailable.jpg')
  )

  return PINCODE_UNAVAILABLE_IMAGE
}
