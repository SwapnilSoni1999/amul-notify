export function getProgressBar(percent: number): string {
  const blocks = Math.floor(percent / 10)
  const bar = '█'.repeat(blocks) + '░'.repeat(10 - blocks)
  return `Progress: [${bar}]`
}

export const createLink = (url: string, text: string) => {
  return `<a href="${url}">${text}</a>`
}
