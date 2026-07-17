export enum AMUL_ERROR_CODE {
  PINCODE_NOT_FOUND = 'PINCODE_NOT_FOUND',
  CLOUDFLARE_CHALLENGE = 'CLOUDFLARE_CHALLENGE'
}

export class AmulError extends Error {
  public code: AMUL_ERROR_CODE
  constructor(message: string, code: AMUL_ERROR_CODE) {
    super(message)
    this.name = 'AmulError'
    this.code = code
  }
}

export const isCloudflareChallengeError = (error: unknown): boolean => {
  if (
    error instanceof AmulError &&
    error.code === AMUL_ERROR_CODE.CLOUDFLARE_CHALLENGE
  ) {
    return true
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const response = (error as { response?: unknown }).response
  if (!response || typeof response !== 'object') {
    return false
  }

  const status = (response as { status?: unknown }).status
  const headers = (response as { headers?: unknown }).headers
  if (status !== 403 || !headers || typeof headers !== 'object') {
    return false
  }

  const mitigatedHeader = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === 'cf-mitigated'
  )?.[1]

  return (
    typeof mitigatedHeader === 'string' &&
    mitigatedHeader.toLowerCase() === 'challenge'
  )
}
