export const DISCLAIMER_TEXT =
  'This tool supports observation and pattern recognition only. It is not a diagnostic tool. Always discuss concerns with a qualified healthcare professional such as your GP, health visitor, or SENCO.'

export const BEHAVIOUR_LISTS = {
  SOCIAL_COMMUNICATION: [
    'Limited response to name',
    'Reduced eye contact',
    'Limited shared attention (joint attention)',
    'Delayed speech development',
    'Difficulty understanding emotions',
    'Limited social play with peers',
    'Preferring solitary play',
    'Difficulty with turn-taking in conversation',
    'Using echolalia (repeating others\' words)',
    'Difficulty with imaginative language or storytelling',
  ],
  BEHAVIOUR_AND_PLAY: [
    'Repetitive play patterns',
    'Strong adherence to routines',
    'Distress when routines change',
    'Limited pretend / imaginative play',
    'Repetitive body movements (hand-flapping, rocking)',
    'Intense focus on specific interests',
    'Lining up objects',
    'Difficulty transitioning between activities',
    'Insistence on specific order or arrangement',
    'Restricted food preferences (texture/colour based)',
  ],
  SENSORY_RESPONSES: [
    'High sensitivity to noise',
    'Texture aversion (food or clothing)',
    'Unusual sensory seeking (spinning, touching)',
    'Sensitivity to bright lights',
    'Reduced sensitivity to pain',
    'Seeking deep pressure',
    'Strong reactions to smells',
    'Covering ears in response to sounds',
    'Distress at certain fabrics or clothing labels',
    'Mouthing objects beyond typical developmental age',
  ],
} as const

export const DOMAIN_OPTIONS = [
  { value: 'SOCIAL_COMMUNICATION', label: 'Social Communication' },
  { value: 'BEHAVIOUR_AND_PLAY', label: 'Behaviour & Play' },
  { value: 'SENSORY_RESPONSES', label: 'Sensory Responses' },
] as const

export const FREQUENCY_OPTIONS = [
  { value: 'RARE', label: 'Rare (once or twice)', description: 'Observed only occasionally' },
  {
    value: 'SOMETIMES',
    label: 'Sometimes (a few times a week)',
    description: 'Observed several times',
  },
  { value: 'OFTEN', label: 'Often (daily or near-daily)', description: 'Observed very regularly' },
] as const

export const CONTEXT_OPTIONS = [
  { value: 'HOME', label: 'Home' },
  { value: 'NURSERY', label: 'Nursery / School' },
  { value: 'OUTDOORS', label: 'Outdoors' },
  { value: 'OTHER', label: 'Other' },
] as const

export const DOMAIN_COLOURS = {
  SOCIAL_COMMUNICATION: '#0284c7',
  BEHAVIOUR_AND_PLAY: '#16a34a',
  SENSORY_RESPONSES: '#fb923c',
} as const

export const DOMAIN_LABELS = {
  SOCIAL_COMMUNICATION: 'Social Communication',
  BEHAVIOUR_AND_PLAY: 'Behaviour & Play',
  SENSORY_RESPONSES: 'Sensory Responses',
} as const

export const FREQUENCY_LABELS = {
  RARE: 'Rare',
  SOMETIMES: 'Sometimes',
  OFTEN: 'Often',
} as const

export const CONTEXT_LABELS = {
  HOME: 'Home',
  NURSERY: 'Nursery',
  OUTDOORS: 'Outdoors',
  OTHER: 'Other',
} as const

export const PATTERN_THRESHOLD = {
  OFTEN_COUNT: 3,
  COMBINED_COUNT: 5,
} as const
