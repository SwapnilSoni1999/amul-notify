// import env from '@/env'
// import { defaultHeaders } from '@/libs/amulApi.lib'
// import { PincodeRecord } from '@/types/amul.types'
// import axios, { AxiosInstance } from 'axios'
// import Bull from 'bull'

// interface SetPincodeJobData {
//   tid: string
//   cookieStr: string
//   record: PincodeRecord
//   amulApi: AxiosInstance
// }

// const pincodeQueue = new Bull<SetPincodeJobData>('pincode', {
//   // queue to set pincode for each amul session

//   limiter: {
//     // 1 request per 5 seconds
//     max: 1,
//     duration: 10 * 1000 // 10 seconds
//   },
//   defaultJobOptions: {
//     jobId: 'pincode-job', // Use a static job ID to avoid duplicates
//     removeOnComplete: true // Remove job from queue after completion
//   },
//   redis: {
//     host: env.REDIS_HOST,
//     port: env.REDIS_PORT,
//     db: env.REDIS_DATABASE_INDEX
//   }
// })

// const processJob: Bull.ProcessCallbackFunction<SetPincodeJobData> = async (
//   job,
//   done: Bull.DoneCallback
// ) => {
//   console.log(`[JobData]:`, job.data)
//   const { tid, cookieStr, record } = job.data

//   console.log('[setPincode] Request Headers:', {
//     ...defaultHeaders,
//     tid,
//     cookie: cookieStr
//   })
//   console.log(`[setPincode] Body:`, {
//     data: { store: record.substore }
//   })

//   // const response = await axios.put(
//   //   'https://shop.amul.com/entity/ms.settings/_/setPreferences',
//   //   {
//   //     data: {
//   //       store: record.substore
//   //     }
//   //   },
//   //   {
//   //     headers: {
//   //       ...defaultHeaders,
//   //       tid: tid,
//   //       cookie: cookieStr // Use the cookie string from the job data
//   //     }
//   //   }
//   // )
//   // // console.log('Set Pincode Response:', response.data)
//   // // this.pincodeRecord = record

//   // // const existingSubstore: AmulApi | undefined = substoreSessions.get(
//   // //   record.substore.toString()
//   // // )

//   // // if (!existingSubstore) {
//   // //   substoreSessions.set(record.substore.toString(), this)
//   // //   console.log(`Added new substore session for ${record.substore}`)
//   // // } else {
//   // //   console.log(`Using existing substore session for ${record.substore}`)
//   // // }

//   // return response.data
// }

// pincodeQueue.process(1, processJob)

// export const setPincodeQueue = async (payload: SetPincodeJobData) => {
//   console.log('Args:', payload)

//   // processJob({ data: payload } as any, () => {})

//   const job = await pincodeQueue.add({
//     ...payload
//   })

//   try {
//     await job.finished()
//   } catch (err) {
//     console.error(`Job failed:`, err)
//     throw err
//   }
// }
