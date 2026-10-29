// Brand colours for training programme cards, so learners can tell their
// programmes apart at a glance. Assigned by position in the list rather than
// stored on the programme: a learner rarely sees more than a few, and cycling
// by position guarantees neighbouring cards never share a colour.
//
// Every class is written out in full so Tailwind can see it. The `dark:`
// variants are deliberate: the global dark-mode overrides in globals.css
// would otherwise turn `bg-white` into slate and lighten the text colours
// unpredictably on the white tile.

export interface ProgramAccent {
  /** Solid band across the top of the card. */
  band: string
  /** Icon tile and percentage pill that sit on the band. */
  chip: string
  /** Progress bar fill. */
  bar: string
}

const ACCENTS: ProgramAccent[] = [
  {
    band: 'bg-aaa-green',
    chip: 'bg-white text-sage-700 dark:bg-slate-900 dark:text-green-300',
    bar: 'bg-aaa-green',
  },
  {
    band: 'bg-aaa-blue',
    chip: 'bg-white text-aaa-blue dark:bg-slate-900 dark:text-sky-300',
    bar: 'bg-aaa-blue',
  },
  {
    band: 'bg-aaa-orange',
    chip: 'bg-white text-warm-700 dark:bg-slate-900 dark:text-orange-300',
    bar: 'bg-aaa-orange',
  },
  {
    band: 'bg-aaa-pink',
    chip: 'bg-white text-pink-700 dark:bg-slate-900 dark:text-pink-300',
    bar: 'bg-aaa-pink',
  },
]

export function programAccent(index: number): ProgramAccent {
  return ACCENTS[((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length]
}

export const PROGRAM_ACCENT_COUNT = ACCENTS.length
