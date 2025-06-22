import env from '@/env'
import { AxiosProxyConfig } from 'axios'
import fs from 'fs'
import path from 'path'

const usedProxies: Map<string, Date> = new Map()

export const getProxy = (): AxiosProxyConfig | false => {
  if (!env.PROXY_ENABLED) {
    console.log('Proxy is not enabled. Skipping proxy configuration.')
    return false
  }
  // use each proxy in 5 minutes gap
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  for (const [proxy, lastUsed] of usedProxies.entries()) {
    if (lastUsed < fiveMinutesAgo) {
      usedProxies.set(proxy, now)
      const [host, port, username, password] = proxy.split(':')
      console.log(
        `Using proxy: ${host}:${port} with username: ${username} and password: ${password}`
      )
      return {
        host,
        port: parseInt(port, 10),
        auth: username && password ? { username, password } : undefined,
        protocol: env.PROXY_PROTOCOL
      }
    }
  }
  // If no proxy is available, return randomly from the list
  const proxies = loadProxies()
  console.log('No available proxies found, using a random proxy.')
  console.log(`Available proxies: ${proxies.length}`)

  const randomProxy = proxies[Math.floor(Math.random() * proxies.length)]
  const [host, port, username, password] = randomProxy.split(':')
  usedProxies.set(randomProxy, now)
  console.log(
    `Using random proxy: ${host}:${port} with username: ${username} and password: ${password}`
  )
  console.log({
    host,
    port: parseInt(port, 10),
    auth: username && password ? { username, password } : undefined,
    protocol: env.PROXY_PROTOCOL
  })
  return {
    host,
    port: parseInt(port, 10),
    auth: username && password ? { username, password } : undefined,
    protocol: env.PROXY_PROTOCOL
  }
}

export const loadProxies = () => {
  const proxyFile = path.join(__dirname, '../../proxylist.txt')
  console.log('Checking for proxy file:', proxyFile)
  if (fs.existsSync(proxyFile) && env.PROXY_ENABLED) {
    console.log('Loading proxies from file:', proxyFile)
    const fileContent = fs.readFileSync(proxyFile, 'utf-8')
    return fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }
  return []
}
