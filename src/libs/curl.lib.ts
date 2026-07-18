import { execFile } from 'node:child_process'

const CURL_TIMEOUT_SECONDS = 30
const CURL_MAX_BUFFER_BYTES = 25 * 1024 * 1024

export interface CurlRequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
}

export interface CurlResponse {
  status: number
  headers: Record<string, string[]>
  body: string
  setCookies: string[]
}

export class CurlHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
    url: string
  ) {
    super(`Curl request to ${url} failed with HTTP ${status}`)
    this.name = 'CurlHttpError'
  }
}

const executeCurl = (args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile(
      'curl',
      args,
      {
        encoding: 'utf8',
        maxBuffer: CURL_MAX_BUFFER_BYTES
      },
      (error, stdout, stderr) => {
        if (error) {
          const details = stderr.trim() || error.message
          reject(new Error(`Curl request failed: ${details}`))
          return
        }

        resolve(stdout)
      }
    )
  })

const parseCurlOutput = (output: string): CurlResponse => {
  let cursor = 0
  let status = 0
  let headers: Record<string, string[]> = {}

  while (output.startsWith('HTTP/', cursor)) {
    const separator = output.indexOf('\r\n\r\n', cursor)
    if (separator === -1) break

    const headerBlock = output.slice(cursor, separator)
    const lines = headerBlock.split('\r\n')
    const statusMatch = lines[0]?.match(/^HTTP\/\S+\s+(\d{3})/)
    if (!statusMatch) break

    status = Number(statusMatch[1])
    headers = {}

    for (const line of lines.slice(1)) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const name = line.slice(0, colonIndex).trim().toLowerCase()
      const value = line.slice(colonIndex + 1).trim()
      ;(headers[name] ??= []).push(value)
    }

    cursor = separator + 4
  }

  if (!status) {
    throw new Error('Curl response did not contain an HTTP status line')
  }

  return {
    status,
    headers,
    body: output.slice(cursor),
    setCookies: headers['set-cookie'] ?? []
  }
}

export const curlRequest = async ({
  url,
  method = 'GET',
  headers = {},
  body
}: CurlRequestOptions): Promise<CurlResponse> => {
  const args = [
    '--silent',
    '--show-error',
    '--location',
    '--globoff',
    '--compressed',
    '--connect-timeout',
    '10',
    '--max-time',
    CURL_TIMEOUT_SECONDS.toString(),
    '--dump-header',
    '-',
    '--request',
    method
  ]

  for (const [name, value] of Object.entries(headers)) {
    args.push('--header', `${name}: ${value}`)
  }

  if (body !== undefined) {
    args.push('--data-raw', JSON.stringify(body))
  }

  args.push(url)

  const response = parseCurlOutput(await executeCurl(args))
  if (response.status >= 400) {
    throw new CurlHttpError(response.status, response.body, url)
  }

  return response
}
