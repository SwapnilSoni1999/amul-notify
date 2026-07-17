import { sleep } from '@/utils'

const MAX_CONCURRENT_AUTO_ORDERS = 2
const AUTO_ORDER_COOLDOWN_MS = 500

interface PendingAutoOrder {
  key: string
  start: () => void
}

const pendingAutoOrders: PendingAutoOrder[] = []
const activeAutoOrderKeys = new Set<string>()
let activeAutoOrderCount = 0

const startPendingAutoOrders = (): void => {
  while (activeAutoOrderCount < MAX_CONCURRENT_AUTO_ORDERS) {
    const pendingIndex = pendingAutoOrders.findIndex(
      ({ key }) => !activeAutoOrderKeys.has(key)
    )

    if (pendingIndex === -1) {
      return
    }

    const [pendingAutoOrder] = pendingAutoOrders.splice(pendingIndex, 1)
    if (!pendingAutoOrder) {
      return
    }

    activeAutoOrderCount++
    activeAutoOrderKeys.add(pendingAutoOrder.key)
    pendingAutoOrder.start()
  }
}

// This limiter is process-local. Production currently runs one bot process.
export const runAutoOrderRequest = <T>(
  key: string,
  request: () => Promise<T>
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    pendingAutoOrders.push({
      key,
      start: () => {
        void Promise.resolve()
          .then(request)
          .then(resolve, reject)
          .finally(async () => {
            await sleep(AUTO_ORDER_COOLDOWN_MS)
            activeAutoOrderKeys.delete(key)
            activeAutoOrderCount--
            startPendingAutoOrders()
          })
      }
    })

    startPendingAutoOrders()
  })
}
