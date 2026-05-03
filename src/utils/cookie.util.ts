export function getCookieValue(
  cookieString: string,
  name: string
): string | undefined {
  for (const part of cookieString.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.includes('=')) {
      continue
    }
    const [key, ...rest] = trimmed.split('=')
    if (key === name) {
      return rest.join('=')
    }
  }
  return undefined
}
