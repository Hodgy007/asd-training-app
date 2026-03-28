export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  type: 'VIDEO' | 'TEXT'
  content: string
  videoUrl?: string
  order: number
  quizQuestions: QuizQuestion[]
}

export interface TrainingModule {
  id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'module-1',
    title: 'Understanding ASD: An Introduction',
    description:
      'An accessible introduction to Autism Spectrum Disorder for caregivers and early years practitioners. Learn what ASD is, how it presents, and why early identification matters.',
    order: 1,
    lessons: [
      {
        id: 'lesson-1-1',
        moduleId: 'module-1',
        title: 'What is Autism Spectrum Disorder?',
        type: 'VIDEO',
        videoUrl: 'https://74u9y331cmlgwrqe.public.blob.vercel-storage.com/training/module-1/what-is-autism-spectrum-disorder.mp4',
        order: 1,
        content: `Autism Spectrum Disorder (ASD) is a neurodevelopmental condition that affects how people perceive and interact with the world around them. The word "spectrum" reflects the wide range of ways in which ASD can present — no two autistic people are the same.

ASD is characterised by differences in three broad areas:
1. **Social communication and interaction** — including challenges with back-and-forth conversation, understanding non-verbal cues, and developing age-appropriate relationships.
2. **Restricted and repetitive behaviours** — such as insistence on sameness, highly focused interests, and repetitive movements or speech.
3. **Sensory processing** — many autistic individuals experience heightened or reduced sensitivity to sensory input such as sound, light, texture, and smell.

In the UK, approximately 1 in 100 people are autistic. ASD is more commonly diagnosed in boys than girls, though research suggests girls may be underdiagnosed due to different presentations.

**Why early identification matters:**
Early identification allows children to access support during the most critical period of brain development. Interventions before the age of 5 can significantly improve language development, social skills, and long-term outcomes.`,
        quizQuestions: [
          {
            id: 'q-1-1-1',
            question: 'What does the "spectrum" in Autism Spectrum Disorder refer to?',
            options: [
              'The severity of the condition only',
              'The wide range of ways ASD can present in different individuals',
              'The age range at which ASD is diagnosed',
              'The different treatments available',
            ],
            correctAnswer: 'The wide range of ways ASD can present in different individuals',
            explanation:
              'The term "spectrum" reflects that ASD presents very differently in each person — some may have significant support needs, others may need very little.',
          },
          {
            id: 'q-1-1-2',
            question: 'Approximately how many people in the UK are autistic?',
            options: ['1 in 1,000', '1 in 500', '1 in 100', '1 in 50'],
            correctAnswer: '1 in 100',
            explanation:
              'Current estimates suggest approximately 1 in 100 people in the UK are autistic.',
          },
          {
            id: 'q-1-1-3',
            question: 'Why is early identification of ASD important?',
            options: [
              'So parents can prepare financially',
              'To allow access to support during critical brain development years',
              'Because ASD can be cured if caught early',
              'To ensure the child is placed in specialist schooling',
            ],
            correctAnswer: 'To allow access to support during critical brain development years',
            explanation:
              'The brain is most plastic (adaptable) in early childhood. Early support can significantly improve communication, social skills, and long-term wellbeing outcomes.',
          },
        ],
      },
      {
        id: 'lesson-1-2',
        moduleId: 'module-1',
        title: 'Myths and Misconceptions About ASD',
        type: 'TEXT',
        order: 2,
        content: `There are many misconceptions about autism that can affect how caregivers, professionals, and society respond to autistic children and adults.

**Myth 1: "All autistic people have the same presentation"**
Fact: ASD is a spectrum. Some autistic people are highly verbal; others are non-speaking. Every autistic person is different.

**Myth 2: "Autism is caused by vaccines"**
Fact: This claim originates from a now-retracted and fraudulent 1998 study. Extensive research involving millions of children has found no link between vaccines and autism.

**Myth 3: "Autistic children don't want friends or affection"**
Fact: Many autistic children deeply desire connection and friendship but may struggle with the social 'rules' that neurotypical peers find intuitive.

**Myth 4: "ASD only affects boys"**
Fact: While more boys are diagnosed, girls are often underdiagnosed because they may 'mask' their difficulties more effectively.

**Myth 5: "If a child makes eye contact, they can't be autistic"**
Fact: Eye contact varies significantly across the spectrum. Some autistic people make eye contact; others find it uncomfortable.

**Myth 6: "Autistic people lack empathy"**
Fact: Many autistic people experience intense empathy. The challenge is often with cognitive empathy rather than emotional empathy.`,
        quizQuestions: [
          {
            id: 'q-1-2-1',
            question: 'Which statement about autism and vaccines is correct?',
            options: [
              'There is a proven link between the MMR vaccine and autism',
              'Some vaccines cause autism in genetically susceptible children',
              'Large-scale research has found no link between vaccines and autism',
              'The jury is still out — more research is needed',
            ],
            correctAnswer: 'Large-scale research has found no link between vaccines and autism',
            explanation:
              'The original 1998 study claiming a vaccine-autism link was fraudulent and retracted. Subsequent research has conclusively found no connection.',
          },
          {
            id: 'q-1-2-2',
            question: 'Why might girls be underdiagnosed with ASD compared to boys?',
            options: [
              'Girls are biologically less likely to have ASD',
              'Girls may mask their difficulties more effectively',
              'Girls present with more severe symptoms',
              'Diagnostic tools are more accurate for girls',
            ],
            correctAnswer: 'Girls may mask their difficulties more effectively',
            explanation:
              "Girls often learn to 'camouflage' autistic traits by copying social behaviours, which can make ASD harder to identify.",
          },
        ],
      },
      {
        id: 'lesson-1-3',
        moduleId: 'module-1',
        title: 'The Role of the Caregiver in Early Identification',
        type: 'TEXT',
        order: 3,
        content: `As a parent, grandparent, childminder, or early years practitioner, you spend more time with a child than any healthcare professional. This gives you a unique and vital perspective.

**What you are NOT being asked to do:**
- You are NOT being asked to diagnose a child
- You are NOT being asked to label a child
- You are NOT replacing professional assessment

**What you ARE being asked to do:**
- Notice and record behaviours systematically
- Track patterns over time
- Communicate your observations clearly to healthcare professionals
- Support the child with warmth and consistency

**The referral pathway in the UK:**
1. Speak with the child's GP or health visitor
2. The GP may refer to a community paediatrician or local autism assessment team
3. The assessment team (usually a multi-disciplinary team) conducts a formal assessment
4. A diagnosis may or may not be given

Your documented observations can be shared at any stage of this process and are extremely valuable.`,
        quizQuestions: [
          {
            id: 'q-1-3-1',
            question: 'What is the primary role of a caregiver using this observation tool?',
            options: [
              'To diagnose the child with ASD',
              'To systematically record and track behavioural patterns',
              'To replace the need for a professional assessment',
              'To decide whether the child needs specialist schooling',
            ],
            correctAnswer: 'To systematically record and track behavioural patterns',
            explanation:
              'Caregivers are uniquely placed to observe children over time. Systematic observation helps build a picture that can be shared with healthcare professionals.',
          },
          {
            id: 'q-1-3-2',
            question:
              "In the UK, who would a caregiver typically speak to first if they have concerns?",
            options: [
              'A specialist autism consultant',
              'The local authority',
              "The child's GP or health visitor",
              'A CAMHS therapist',
            ],
            correctAnswer: "The child's GP or health visitor",
            explanation:
              "The first step in the UK referral pathway is usually speaking with the child's GP or health visitor.",
          },
        ],
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Social Communication: What to Look For',
    description:
      'Explore the social communication domain of ASD observation. Learn how to recognise differences in language development, eye contact, joint attention, and social play.',
    order: 2,
    lessons: [
      {
        id: 'lesson-2-1',
        moduleId: 'module-2',
        title: 'Understanding Joint Attention',
        type: 'VIDEO',
        order: 1,
        content: `Joint attention is one of the earliest and most important social communication milestones. It refers to the shared focus of two individuals on an object or event.

**What does joint attention look like?**
- A child points at a dog and looks back at you to check you've seen it too
- A child holds up a toy to show you
- A child follows your pointing finger to look at what you're indicating
- A child looks between you and an interesting object

**Typical development milestones for joint attention:**
- 9 months: Follows another person's gaze
- 10-11 months: Responds to pointing
- 12 months: Points to request objects
- 14-16 months: Points to share interest (declarative pointing)

**What reduced joint attention might look like:**
- A child who rarely points to share interest
- A child who doesn't look back when they discover something exciting
- A child who uses your hand as a tool rather than making eye contact to request`,
        quizQuestions: [
          {
            id: 'q-2-1-1',
            question: 'Which of the following is an example of declarative pointing?',
            options: [
              'A child points at a biscuit tin to request a biscuit',
              'A child points at a bird to share their excitement about it',
              "A child uses an adult's hand to open a door",
              'A child waves goodbye',
            ],
            correctAnswer: 'A child points at a bird to share their excitement about it',
            explanation:
              'Declarative pointing is pointing to share interest or experience. Reduced declarative pointing is particularly associated with ASD.',
          },
          {
            id: 'q-2-1-2',
            question:
              'At approximately what age do most children develop declarative pointing?',
            options: ['6-8 months', '9-10 months', '14-16 months', '18-24 months'],
            correctAnswer: '14-16 months',
            explanation:
              'Declarative pointing typically emerges around 14-16 months.',
          },
        ],
      },
      {
        id: 'lesson-2-2',
        moduleId: 'module-2',
        title: 'Language Development and Communication Differences',
        type: 'TEXT',
        order: 2,
        content: `Language development in autistic children can vary enormously. Language differences in ASD are not just about vocabulary — they include how language is used for communication.

**Key language milestones:**
- 12 months: First words
- 18 months: Around 20 words
- 24 months: 50+ words; starting to combine two words
- 36 months: 3-word sentences

**Language patterns that may indicate a need for further exploration:**
- Regression in language (child loses words they previously used)
- Echolalia — repeating words, phrases, or whole chunks of heard speech
- Using memorised scripts rather than spontaneous language
- Speaking "at" rather than "with" people
- Difficulty with pronouns
- Unusual intonation or rhythm of speech
- Very literal interpretation of language

**Echolalia:**
Echolalia is the repetition of heard language. It can be immediate or delayed. Echolalia can also be functional — a way of communicating — and should not automatically be suppressed.`,
        quizQuestions: [
          {
            id: 'q-2-2-1',
            question: 'What is echolalia?',
            options: [
              'The ability to mimic sounds heard in nature',
              'Repeating words or phrases heard from others',
              'Unusually loud speech',
              'Speaking in a monotone voice',
            ],
            correctAnswer: 'Repeating words or phrases heard from others',
            explanation:
              'Echolalia is the repetition of heard language — either immediately or hours/days later (delayed echolalia).',
          },
          {
            id: 'q-2-2-2',
            question:
              'Which of the following language patterns is particularly significant to note?',
            options: [
              'A child who develops speech slightly later but catches up',
              'A child who loses words they previously used (language regression)',
              'A child who has a larger vocabulary than average',
              'A child who prefers speaking in sentences to single words',
            ],
            correctAnswer: 'A child who loses words they previously used (language regression)',
            explanation:
              'Language regression is a significant developmental concern and should always be discussed with a GP or health visitor promptly.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-3',
    title: 'Behaviour and Play: Patterns and Routines',
    description:
      'Learn to identify and document patterns in play, routine adherence, repetitive behaviours, and transitions.',
    order: 3,
    lessons: [
      {
        id: 'lesson-3-1',
        moduleId: 'module-3',
        title: 'Repetitive Behaviours and Stimming',
        type: 'VIDEO',
        order: 1,
        content: `Repetitive behaviours are one of the hallmarks of ASD. These can take many forms, from repetitive movements to insistence on sameness in routines.

**Types of repetitive behaviour:**

**Motor stereotypies (stimming):**
Common examples include:
- Hand-flapping (often when excited or overwhelmed)
- Body rocking
- Spinning in circles
- Finger-flicking in front of eyes
- Jumping repeatedly
- Vocalising (humming, squealing, repeating sounds)

**Why do autistic people stim?**
Stimming serves important functions:
- Helps regulate sensory input (calming when overwhelmed)
- Expresses emotion (excitement, joy, anxiety)
- Provides pleasurable sensory feedback
- Helps focus attention

Stimming is not inherently harmful and should not be suppressed unless it poses a safety risk.

**Insistence on sameness:**
- Becomes very distressed when usual routine is disrupted
- Insists on specific routes or sequences of activities
- Small changes cause meltdowns
- Has strong rituals around transitions`,
        quizQuestions: [
          {
            id: 'q-3-1-1',
            question: 'What is "stimming"?',
            options: [
              'A type of speech therapy technique',
              'Self-stimulatory repetitive behaviour that helps regulate sensory input and emotion',
              'A diagnostic test for ASD',
              "Deliberately attempting to stimulate a child's development",
            ],
            correctAnswer:
              'Self-stimulatory repetitive behaviour that helps regulate sensory input and emotion',
            explanation:
              'Stimming refers to repetitive movements or sounds that serve a self-regulatory function.',
          },
          {
            id: 'q-3-1-2',
            question:
              'A child becomes very distressed when their bedtime routine changes by 10 minutes. This is an example of:',
            options: [
              'Naughtiness or attention-seeking behaviour',
              'Insistence on sameness, a common feature of ASD',
              'Anxiety disorder unrelated to ASD',
              'Typical toddler behaviour that should be ignored',
            ],
            correctAnswer: 'Insistence on sameness, a common feature of ASD',
            explanation:
              'Insistence on sameness and distress at routine changes are common features of ASD.',
          },
        ],
      },
      {
        id: 'lesson-3-2',
        moduleId: 'module-3',
        title: 'Play Development and Imaginative Play',
        type: 'TEXT',
        order: 2,
        content: `Play is how children learn. The way a child plays provides important insight into their developmental stage.

**Typical play development stages:**
- 0-12 months: Sensory exploration
- 12-18 months: Functional play
- 18 months - 3 years: Symbolic play begins
- 2-3 years: Simple pretend play with others
- 3-4 years: Complex imaginative play with peers
- 4-5 years: Rich, collaborative imaginative play

**Play patterns that may indicate a need for further exploration:**

**Limited pretend / imaginative play:**
Some autistic children show reduced symbolic or pretend play. Rather than imaginative scenarios, play may be more systematic or sensory-focused.

**Repetitive play patterns:**
Lining up toys, sorting by colour or size, or playing with a single aspect of a toy (e.g., spinning wheels on a car).

**Solitary play preference:**
A strong preference for playing alone, even when peers are available and welcoming.

**Difficulty with flexible play:**
Insisting that play follows specific rules; distress when other children want to play differently.`,
        quizQuestions: [
          {
            id: 'q-3-2-1',
            question:
              'At approximately what age would you expect a child to begin symbolic play?',
            options: ['6-9 months', '12-18 months', '18 months - 3 years', '4-5 years'],
            correctAnswer: '18 months - 3 years',
            explanation:
              'Symbolic play typically begins around 18 months and develops through age 3.',
          },
          {
            id: 'q-3-2-2',
            question: 'Which play behaviour might be worth recording as an observation?',
            options: [
              'A 5-year-old who enjoys playing with peers at school',
              'A 3-year-old who lines up all toys rather than playing imaginatively',
              'A 2-year-old who prefers playing with adults to other children',
              'A 4-year-old who has a favourite toy they carry everywhere',
            ],
            correctAnswer:
              'A 3-year-old who lines up all toys rather than playing imaginatively',
            explanation:
              'Lining up objects rather than engaging in imaginative play is a repetitive behaviour pattern worth recording.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-4',
    title: 'Sensory Processing Differences',
    description:
      'Understand how sensory processing differences manifest in autistic children. Learn to identify both hypersensitivity and hyposensitivity.',
    order: 4,
    lessons: [
      {
        id: 'lesson-4-1',
        moduleId: 'module-4',
        title: 'The Eight Senses and ASD',
        type: 'VIDEO',
        order: 1,
        content: `Most people are familiar with the five senses. But there are actually eight sensory systems, and all of them can be affected differently in autistic individuals.

**The eight sensory systems:**
1. **Visual (sight)**
2. **Auditory (hearing)**
3. **Tactile (touch)**
4. **Gustatory (taste)**
5. **Olfactory (smell)**
6. **Vestibular (balance/movement)**
7. **Proprioceptive (body awareness)**
8. **Interoceptive (internal body signals)**

**Hypersensitivity vs Hyposensitivity:**
Autistic people can be hypersensitive (over-responsive) or hyposensitive (under-responsive) to any of these senses.

**Examples of hypersensitivity:**
- Covering ears when others can't hear a sound
- Distress at clothing labels or seams
- Extreme food refusal due to texture
- Distress in brightly lit environments

**Examples of hyposensitivity:**
- Seeking deep pressure
- Not appearing to notice pain from falls
- Seeking extreme sensory input (spinning, jumping)
- Putting inedible objects in mouth beyond typical age`,
        quizQuestions: [
          {
            id: 'q-4-1-1',
            question: 'How many sensory systems are there?',
            options: ['5', '6', '7', '8'],
            correctAnswer: '8',
            explanation:
              'Beyond the traditional five senses, there are also vestibular, proprioceptive, and interoceptive systems.',
          },
          {
            id: 'q-4-1-2',
            question:
              'A child seeks out tight hugs and prefers very heavy blankets. This is an example of:',
            options: [
              'Hypersensitivity to proprioceptive input',
              'Hyposensitivity (sensory seeking) for proprioceptive input',
              'Visual hypersensitivity',
              'Auditory hyposensitivity',
            ],
            correctAnswer: 'Hyposensitivity (sensory seeking) for proprioceptive input',
            explanation:
              "Seeking deep pressure indicates the child's proprioceptive system needs more input than typical.",
          },
        ],
      },
      {
        id: 'lesson-4-2',
        moduleId: 'module-4',
        title: 'Observing and Recording Sensory Behaviours',
        type: 'TEXT',
        order: 2,
        content: `Sensory differences can significantly affect a child's ability to participate in daily activities and learning.

**What to observe:**

**In the home setting:**
- Does the child respond unusually to household sounds?
- Does the child refuse certain foods based on texture or smell?
- Does the child remove clothing items (especially socks, labels, seams)?
- Does the child appear unaware of pain when injured?
- Does the child seek spinning, rocking, or crashing behaviours?

**In the nursery/school setting:**
- Does the child struggle in noisy environments (dining hall, playground)?
- Does the child cover ears or show distress at fire drills?
- Does the child avoid or seek out messy play (sand, water, paint)?

**Recording sensory observations:**
When recording, include:
- The specific trigger
- The response observed
- The frequency
- The context

**Important considerations:**
- Sensory differences exist on a spectrum and change with age and stress levels
- Sensory differences can cause significant distress and are not "naughty" behaviour
- Occupational therapists with sensory integration training can provide specialist assessment`,
        quizQuestions: [
          {
            id: 'q-4-2-1',
            question: 'When recording a sensory observation, which information is most useful?',
            options: [
              "The child's mood that morning",
              'The specific trigger, the response observed, and the frequency',
              'Whether the behaviour happened at home or at school',
              'How the caregiver responded to the behaviour',
            ],
            correctAnswer: 'The specific trigger, the response observed, and the frequency',
            explanation:
              'Useful sensory observations include the specific trigger, the observed response, and how frequently it occurs.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-5',
    title: 'Next Steps: Referrals, Support, and Self-Care',
    description:
      'Guidance on the UK referral pathway, how to prepare for appointments, understanding EHCPs, and looking after your own wellbeing.',
    order: 5,
    lessons: [
      {
        id: 'lesson-5-1',
        moduleId: 'module-5',
        title: 'Navigating the UK Assessment Pathway',
        type: 'TEXT',
        order: 1,
        content: `Understanding how the UK diagnostic pathway works can help caregivers feel more prepared and empowered.

**Step 1: Raise concerns with your GP or health visitor**
Start by speaking to the child's GP or health visitor. Bring your documented observations.

**Step 2: Referral to assessment services**
In most areas, ASD assessments are carried out by a multi-disciplinary team (MDT) which may include:
- A community paediatrician or child psychiatrist
- A speech and language therapist
- An educational psychologist
- A clinical psychologist or specialist nurse

Waiting times vary significantly — from a few months to several years.

**Step 3: The assessment**
The assessment typically involves:
- Parental/caregiver interview (detailed developmental history)
- Structured observation of the child
- Cognitive and communication assessments
- Information from school or nursery (SENCO report)

**Step 4: Post-diagnosis support**
Following diagnosis, families can access:
- An Education, Health and Care Plan (EHCP)
- Local support groups and charities
- Specialist services (CAMHS, speech therapy, OT)
- Benefits and allowances (Disability Living Allowance)

**Useful organisations:**
- National Autistic Society (autism.org.uk)
- Ambitious About Autism
- Local authority SEND team`,
        quizQuestions: [
          {
            id: 'q-5-1-1',
            question:
              "What is the typical first step if a caregiver has concerns about a child's development in the UK?",
            options: [
              'Contacting CAMHS directly',
              'Requesting an EHCP from the local authority',
              "Speaking with the child's GP or health visitor",
              'Arranging a private assessment',
            ],
            correctAnswer: "Speaking with the child's GP or health visitor",
            explanation:
              "The first step is usually speaking with the GP or health visitor. Bring your documented observations to this appointment.",
          },
          {
            id: 'q-5-1-2',
            question: 'What does EHCP stand for?',
            options: [
              'Early Help and Child Protection',
              'Education, Health and Care Plan',
              'Enhanced Health and Community Provision',
              'Early Help and Coordination Plan',
            ],
            correctAnswer: 'Education, Health and Care Plan',
            explanation:
              'An EHCP is a legal document for children with significant special educational needs that outlines the support they should receive.',
          },
        ],
      },
      {
        id: 'lesson-5-2',
        moduleId: 'module-5',
        title: 'Caregiver Wellbeing and Resilience',
        type: 'TEXT',
        order: 2,
        content: `Supporting a child who may have additional needs can be rewarding, but also exhausting. Looking after your own wellbeing is essential.

**Common challenges caregivers face:**
- Anxiety about the child's future
- Stress during the assessment waiting period
- Grief or adjustment following a diagnosis
- Navigating complex systems
- Managing meltdowns and challenging behaviour
- Sleep deprivation

**Practical self-care strategies:**
- **Connect with others:** Peer support groups for parents of autistic children can be enormously helpful.
- **Accept help:** Allow family and friends to assist.
- **Access your own GP:** Caregiver stress and burnout are real.
- **Take breaks:** Respite care can be arranged through the local authority or third-sector organisations.

**Supporting siblings:**
Siblings of children with additional needs may need extra attention, reassurance, and explanation. Age-appropriate conversations about autism can help.

**Remember:**
A diagnosis does not change who a child is. It can open doors to support, provide explanation for challenges, and connect families with others who understand.`,
        quizQuestions: [
          {
            id: 'q-5-2-1',
            question:
              'Why is caregiver wellbeing described as essential rather than a luxury?',
            options: [
              'Because caregivers deserve a break',
              'Because caregiver wellbeing directly affects the quality of care and child outcomes',
              'Because it is a legal requirement',
              'Because it reduces NHS costs',
            ],
            correctAnswer:
              'Because caregiver wellbeing directly affects the quality of care and child outcomes',
            explanation:
              'Supported, well caregivers are better able to provide consistent, calm, and responsive care. Caregiver burnout can negatively impact the child.',
          },
        ],
      },
    ],
  },
]

export function getModuleById(moduleId: string): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.id === moduleId)
}

export function getLessonById(moduleId: string, lessonId: string): Lesson | undefined {
  const module = getModuleById(moduleId)
  return module?.lessons.find((l) => l.id === lessonId)
}

export function getTotalLessons(): number {
  return TRAINING_MODULES.reduce((acc, m) => acc + m.lessons.length, 0)
}

export function getLessonCount(moduleId: string): number {
  return getModuleById(moduleId)?.lessons.length ?? 0
}
