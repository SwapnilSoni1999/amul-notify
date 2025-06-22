import UserModel from '@/models/user.model'

export const getDistinctSubstores = async (): Promise<string[]> => {
  const data = await UserModel.aggregate<{
    _id: 'substores'
    substores: string[]
  }>([
    {
      $group: {
        _id: 'substores',
        substores: { $addToSet: '$substore' }
      }
    }
  ])

  return data?.[0]?.substores || []
}

export const getDistinctPincodes = async (): Promise<string[]> => {
  const data = await UserModel.aggregate<{
    _id: 'pincodes'
    pincodes: string[]
  }>([
    {
      $group: {
        _id: 'pincodes',
        pincodes: { $addToSet: '$pincode' }
      }
    }
  ])

  return data?.[0]?.pincodes || []
}
