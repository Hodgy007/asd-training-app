import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.VERCEL_OIDC_TOKEN ?? '',
})

async function main() {
  console.log('Testing Vercel AI Gateway...')

  const result = streamText({
    model: openai('openai/gpt-4o-mini'),
    prompt: 'Say hello and confirm the Vercel AI Gateway is working. Keep it to one sentence.',
  })

  for await (const chunk of (await result).textStream) {
    process.stdout.write(chunk)
  }
  console.log('\nDone.')
}

main().catch(console.error)
