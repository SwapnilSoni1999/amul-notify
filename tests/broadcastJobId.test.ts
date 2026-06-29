import { strictEqual, notStrictEqual, ok } from 'node:assert'
import { test } from 'node:test'
import { getSendMessageJobId } from '../src/queues/broadcastJobId.util'

test('send-message job ids are scoped by operation and chat', () => {
  const firstBroadcastJobId = getSendMessageJobId(12345, 'broadcast-a')
  const secondBroadcastJobId = getSendMessageJobId(12345, 'broadcast-b')

  strictEqual(firstBroadcastJobId, 'broadcast-a-12345')
  strictEqual(secondBroadcastJobId, 'broadcast-b-12345')
  notStrictEqual(firstBroadcastJobId, secondBroadcastJobId)
})

test('overlapping sends without an explicit operation id get distinct job ids', () => {
  const firstJobId = getSendMessageJobId(12345)
  const secondJobId = getSendMessageJobId(12345)

  notStrictEqual(firstJobId, secondJobId)
  ok(firstJobId.endsWith('-12345'))
  ok(secondJobId.endsWith('-12345'))
})
