// Prisma CLI configuration (Prisma 7). The CLI no longer reads `.env` itself
// or takes URLs from schema.prisma, so both live here.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  // `db push`, `migrate` and `studio` use the direct (non-pooled) connection,
  // as `directUrl` did before. Optional so `prisma generate` works without it
  // (e.g. a fresh clone or CI with no database).
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
