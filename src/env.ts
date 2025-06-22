import chalk from 'chalk'
import { existsSync, writeFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['local', 'production', 'staging', 'test']).default('local'),
  // Server Configuration
  MONGO_URI: z.string().min(1, { message: 'MONGO_URI is required' }),
  // Bot Configuration
  BOT_TOKEN: z.string().min(1, { message: 'BOT_TOKEN is required' }),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_DATABASE_INDEX: z.coerce.number().default(0),

  // Tracker
  TRACKER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),

  // Proxy Configuration
  PROXY_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  // PROXY_HOST: z.string().default(''),
  // PROXY_PORT: z.coerce.number().min(0).default(0),
  // PROXY_USERNAME: z.string().default(''),
  // PROXY_PASSWORD: z.string().default(''),
  PROXY_PROTOCOL: z.enum(['http', 'https']).default('http')
})

export type Env = z.infer<typeof envSchema>

if (!existsSync('.env.example')) {
  // if .env.example do not exist, create it
  console.log(
    chalk.yellow(
      'Creating .env.example file. Please update it with your environment variables.'
    )
  )
  const shape = envSchema.shape

  const lines: string[] = []

  let currentSectionTitle = ''
  for (const [key, value] of Object.entries(shape)) {
    const title = key.split('_')[0].toUpperCase()
    if (currentSectionTitle !== title) {
      lines.push(`\n# ${title}`)
      currentSectionTitle = title
    }

    const defaultValue =
      'defaultValue' in value._def ? value._def.defaultValue().toString() : ''

    lines.push(`${key}=${defaultValue}`)
  }

  const content = lines.join('\n')
  writeFileSync('.env.example', content, {
    encoding: 'utf-8'
  })
}

const refinedEnv = envSchema.superRefine((data, ctx) => {
  if (data.PROXY_ENABLED) {
    const proxyFile = path.join(__dirname, '../proxylist.txt')
    if (!existsSync(proxyFile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Proxy list file is required when PROXY_ENABLED is true, Please create a proxylist.txt file in the root directory.'
      })
    }

    // if (!data.PROXY_HOST && !data.PROXY_PORT) {
    //   ctx.addIssue({
    //     code: z.ZodIssueCode.custom,
    //     message:
    //       'PROXY_HOST and PROXY_PORT are required when PROXY_ENABLED is true'
    //   })
    // }

    // // Check for both username and password if either is provided
    // if (
    //   (data.PROXY_USERNAME && !data.PROXY_PASSWORD) ||
    //   (!data.PROXY_USERNAME && data.PROXY_PASSWORD)
    // ) {
    //   ctx.addIssue({
    //     code: z.ZodIssueCode.custom,
    //     message:
    //       'Both PROXY_USERNAME and PROXY_PASSWORD must be provided if one is set'
    //   })
    // }
  }
})
const result = refinedEnv.safeParse(process.env)
if (!result.success) {
  console.error(
    chalk.red('Invalid environment variables Please check your .env file:')
  )
  console.error(
    chalk.red(
      result.error.errors
        .flatMap(
          (e) => `${chalk.redBright(`[${e.path?.join('][')}]`)}: ${e.message}`
        )
        .join('\n')
    )
  )

  process.exit(1)
}

const env = result.data
export default env
