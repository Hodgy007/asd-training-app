/**
 * Gatsby Benchmarks — the 8 UK careers-guidance standards used by schools and
 * colleges to self-assess their careers provision (via the CEC Compass+ tool).
 *
 * Modules in the training CMS can be tagged with one or more of these codes
 * via the `gatsbyBenchmarks` field on the `Module` model. The same codes are
 * surfaced to learners on module cards and exported in alignment reports.
 */

export const GATSBY_BENCHMARK_CODES = [
  'BM1',
  'BM2',
  'BM3',
  'BM4',
  'BM5',
  'BM6',
  'BM7',
  'BM8',
] as const

export type GatsbyBenchmarkCode = (typeof GATSBY_BENCHMARK_CODES)[number]

export const GATSBY_BENCHMARKS: Record<GatsbyBenchmarkCode, { short: string; full: string }> = {
  BM1: { short: 'Stable careers programme',    full: 'A stable careers programme' },
  BM2: { short: 'Career & labour market info', full: 'Learning from career and labour market information' },
  BM3: { short: 'Needs of each pupil',         full: 'Addressing the needs of each pupil' },
  BM4: { short: 'Curriculum to careers',       full: 'Linking curriculum learning to careers' },
  BM5: { short: 'Encounters with employers',   full: 'Encounters with employers and employees' },
  BM6: { short: 'Workplace experiences',       full: 'Experiences of workplaces' },
  BM7: { short: 'FE & HE encounters',          full: 'Encounters with further and higher education' },
  BM8: { short: 'Personal guidance',           full: 'Personal guidance' },
}

export function isValidBenchmark(code: string): code is GatsbyBenchmarkCode {
  return (GATSBY_BENCHMARK_CODES as readonly string[]).includes(code)
}

/**
 * Filters arbitrary input down to a deduplicated array of valid benchmark codes.
 * Used by API routes to sanitise client-supplied values before persisting.
 */
export function sanitiseBenchmarks(input: unknown): GatsbyBenchmarkCode[] {
  if (!Array.isArray(input)) return []
  const valid = input
    .filter((c): c is string => typeof c === 'string')
    .filter(isValidBenchmark)
  return Array.from(new Set(valid))
}
