export function getProgressBar(percent: number): string {
  const blocks = Math.floor(percent / 10)
  const bar = '█'.repeat(blocks) + '░'.repeat(10 - blocks)
  return `Progress: [${bar}]`
}
