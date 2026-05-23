export enum AMUL_ERROR_CODE {
  PINCODE_NOT_FOUND = 'PINCODE_NOT_FOUND'
}

export class AmulError extends Error {
  public code: AMUL_ERROR_CODE
  constructor(message: string, code: AMUL_ERROR_CODE) {
    super(message)
    this.name = 'AmulError'
    this.code = code
  }
}
