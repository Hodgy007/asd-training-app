import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const trainingModules = [
  {
    id: 'module-1',
    title: 'Understanding ASD: An Introduction',
    description:
      'An accessible introduction to Autism Spectrum Disorder for caregivers and early years practitioners. Learn what ASD is, how it presents, and why early identification matters.',
    order: 1,
    lessons: [
      {
        id: 'lesson-1-1',
        title: 'What is Autism Spectrum Disorder?',
        type: 'VIDEO',
        order: 1,
        content: `Autism Spectrum Disorder (ASD) is a neurodevelopmental condition that affects how people perceive and interact with the world around them. The word "spectrum" reflects the wide range of ways in which ASD can present — no two autistic people are the same.

ASD is characterised by differences in three broad areas:
1. **Social communication and interaction** — including challenges with back-and-forth conversation, understanding non-verbal cues, and developing age-appropriate relationships.
2. **Restricted and repetitive behaviours** — such as insistence on sameness, highly focused interests, and repetitive movements or speech.
3. **Sensory processing** — many autistic individuals experience heightened or reduced sensitivity to sensory input such as sound, light, texture, and smell.

In the UK, approximately 1 in 100 people are autistic. ASD is more commonly diagnosed in boys than girls, though research suggests girls may be underdiagnosed due to different presentations.

**Why early identification matters:**
Early identification allows children to access support during the most critical period of brain development. Interventions before the age of 5 can significantly improve language development, social skills, and long-term outcomes. As a caregiver or early years practitioner, your observations are invaluable in this process.`,
        quizQuestions: [
          {
            id: 'q-1-1-1',
            question: 'What does the "spectrum" in Autism Spectrum Disorder refer to?',
            options: JSON.stringify([
              'The severity of the condition only',
              'The wide range of ways ASD can present in different individuals',
              'The age range at which ASD is diagnosed',
              'The different treatments available',
            ]),
            correctAnswer: 'The wide range of ways ASD can present in different individuals',
            explanation:
              'The term "spectrum" reflects that ASD presents very differently in each person — some may have significant support needs, others may need very little. No two autistic people are the same.',
          },
          {
            id: 'q-1-1-2',
            question: 'Approximately how many people in the UK are autistic?',
            options: JSON.stringify(['1 in 1,000', '1 in 500', '1 in 100', '1 in 50']),
            correctAnswer: '1 in 100',
            explanation:
              'Current estimates suggest approximately 1 in 100 people in the UK are autistic. This figure may be higher as awareness and diagnosis rates continue to improve.',
          },
          {
            id: 'q-1-1-3',
            question: 'Why is early identification of ASD important?',
            options: JSON.stringify([
              'So parents can prepare financially',
              'To allow access to support during critical brain development years',
              'Because ASD can be cured if caught early',
              'To ensure the child is placed in specialist schooling',
            ]),
            correctAnswer: 'To allow access to support during critical brain development years',
            explanation:
              'The brain is most plastic (adaptable) in early childhood. Early support can significantly improve communication, social skills, and long-term wellbeing outcomes.',
          },
        ],
      },
      {
        id: 'lesson-1-2',
        title: 'Myths and Misconceptions About ASD',
        type: 'TEXT',
        order: 2,
        content: `There are many misconceptions about autism that can affect how caregivers, professionals, and society respond to autistic children and adults. Understanding the facts is essential for providing appropriate support.

**Myth 1: "All autistic people have the same presentation"**
Fact: ASD is a spectrum. Some autistic people are highly verbal and academic; others are non-speaking. Some need significant daily support; others live very independently. Every autistic person is different.

**Myth 2: "Autism is caused by vaccines"**
Fact: This claim originates from a now-retracted and fraudulent 1998 study. Extensive research involving millions of children has found no link between vaccines and autism. Vaccines are safe and important for protecting public health.

**Myth 3: "Autistic children don't want friends or affection"**
Fact: Many autistic children deeply desire connection and friendship but may struggle with the social 'rules' that neurotypical peers find intuitive. They may express affection differently.

**Myth 4: "ASD only affects boys"**
Fact: While more boys are diagnosed, girls are often underdiagnosed because they may 'mask' their difficulties more effectively. Research is increasingly focused on identifying ASD in girls and women.

**Myth 5: "If a child makes eye contact, they can't be autistic"**
Fact: Eye contact varies significantly across the spectrum. Some autistic people make eye contact; others find it uncomfortable. Eye contact alone is not a reliable indicator.

**Myth 6: "Autistic people lack empathy"**
Fact: Many autistic people experience intense empathy. The challenge is often with *cognitive empathy* (understanding another's perspective) rather than *emotional empathy* (feeling what others feel).`,
        quizQuestions: [
          {
            id: 'q-1-2-1',
            question:
              'Which of the following statements about autism and vaccines is correct?',
            options: JSON.stringify([
              'There is a proven link between the MMR vaccine and autism',
              'Some vaccines cause autism in genetically susceptible children',
              'Large-scale research has found no link between vaccines and autism',
              'The jury is still out — more research is needed',
            ]),
            correctAnswer: 'Large-scale research has found no link between vaccines and autism',
            explanation:
              'The original 1998 study claiming a vaccine-autism link was fraudulent and retracted. Subsequent research involving millions of children has conclusively found no connection.',
          },
          {
            id: 'q-1-2-2',
            question: 'Why might girls be underdiagnosed with ASD compared to boys?',
            options: JSON.stringify([
              'Girls are biologically less likely to have ASD',
              'Girls may mask their difficulties more effectively',
              'Girls present with more severe symptoms, making them easier to identify',
              'Diagnostic tools are more accurate for girls',
            ]),
            correctAnswer: 'Girls may mask their difficulties more effectively',
            explanation:
              "Girls often learn to 'camouflage' or 'mask' autistic traits by copying social behaviours, which can make ASD harder to identify. This can lead to later diagnosis and missed support.",
          },
        ],
      },
      {
        id: 'lesson-1-3',
        title: 'The Role of the Caregiver in Early Identification',
        type: 'TEXT',
        order: 3,
        content: `As a parent, grandparent, childminder, or early years practitioner, you spend more time with a child than any healthcare professional. This gives you a unique and vital perspective.

**Why your observations matter:**
Healthcare professionals see a child for a matter of minutes during assessments. You see the child across weeks, months, and years, in familiar and unfamiliar settings, during routine and during challenge. Your careful observations can provide the evidence base that leads to timely support.

**What you are NOT being asked to do:**
- You are NOT being asked to diagnose a child
- You are NOT being asked to label a child
- You are NOT replacing professional assessment

**What you ARE being asked to do:**
- Notice and record behaviours systematically
- Track patterns over time
- Communicate your observations clearly to healthcare professionals
- Support the child with warmth and consistency regardless of any label

**The referral pathway in the UK:**
If you have concerns about a child's development, the typical pathway is:
1. Speak with the child's GP or health visitor
2. The GP may refer to a community paediatrician or local autism assessment team
3. The assessment team (usually a multi-disciplinary team) conducts a formal assessment
4. A diagnosis may or may not be given

Your documented observations can be shared at any stage of this process and are extremely valuable.

**Important reminder:**
Observation and pattern-spotting is not the same as diagnosis. Many of the behaviours listed in this training are also seen in children who are not autistic. The purpose of tracking is to identify consistent patterns that may warrant further professional exploration.`,
        quizQuestions: [
          {
            id: 'q-1-3-1',
            question:
              'What is the primary role of a caregiver using this observation tool?',
            options: JSON.stringify([
              'To diagnose the child with ASD',
              'To systematically record and track behavioural patterns',
              'To replace the need for a professional assessment',
              'To decide whether the child needs specialist schooling',
            ]),
            correctAnswer: 'To systematically record and track behavioural patterns',
            explanation:
              'Caregivers are uniquely placed to observe children over time. Systematic observation helps build a picture that can be shared with healthcare professionals — it is not a diagnostic tool.',
          },
          {
            id: 'q-1-3-2',
            question: 'In the UK, who would a caregiver typically speak to first if they have concerns about a child\'s development?',
            options: JSON.stringify([
              'A specialist autism consultant',
              'The local authority',
              'The child\'s GP or health visitor',
              'A CAMHS therapist',
            ]),
            correctAnswer: "The child's GP or health visitor",
            explanation:
              "The first step in the UK referral pathway is usually speaking with the child's GP or health visitor, who can then refer to specialist services if appropriate.",
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
        title: 'Understanding Joint Attention',
        type: 'VIDEO',
        order: 1,
        content: `Joint attention is one of the earliest and most important social communication milestones. It refers to the shared focus of two individuals on an object or event — the ability to "look at that together."

**What does joint attention look like?**
- A child points at a dog and looks back at you to check you've seen it too
- A child holds up a toy to show you
- A child follows your pointing finger to look at what you're indicating
- A child looks between you and an interesting object

**Why does joint attention matter?**
Joint attention is a building block for language, learning, and social development. When children share attention with others, they are:
- Learning vocabulary by following another person's gaze
- Developing an understanding that other people have perspectives
- Practising the back-and-forth of social interaction
- Building the foundation for later conversation skills

**Typical development milestones for joint attention:**
- 9 months: Follows another person's gaze
- 10-11 months: Responds to pointing
- 12 months: Points to request objects
- 14-16 months: Points to share interest (declarative pointing)

**What reduced joint attention might look like:**
- A child who rarely points to share interest
- A child who doesn't look back when they discover something exciting
- A child who doesn't follow your point
- A child who uses your hand as a tool rather than making eye contact to request

**Important context:**
Reduced joint attention is one signal, not a diagnosis. Some children develop these skills slightly later, or in different ways. The pattern across multiple observations over time is what matters.`,
        quizQuestions: [
          {
            id: 'q-2-1-1',
            question: "Which of the following is an example of declarative pointing?",
            options: JSON.stringify([
              "A child points at a biscuit tin to request a biscuit",
              "A child points at a bird to share their excitement about it",
              "A child uses an adult's hand to open a door",
              "A child waves goodbye",
            ]),
            correctAnswer: 'A child points at a bird to share their excitement about it',
            explanation:
              'Declarative pointing is pointing to share interest or experience — "look at that!" Imperative pointing is pointing to request something. Reduced declarative pointing is particularly associated with ASD.',
          },
          {
            id: 'q-2-1-2',
            question: 'At approximately what age do most children develop declarative pointing?',
            options: JSON.stringify(['6-8 months', '9-10 months', '14-16 months', '18-24 months']),
            correctAnswer: '14-16 months',
            explanation:
              'Declarative pointing (pointing to share interest) typically emerges around 14-16 months. Earlier pointing (around 12 months) is usually imperative — to request objects.',
          },
        ],
      },
      {
        id: 'lesson-2-2',
        title: 'Language Development and Communication Differences',
        type: 'TEXT',
        order: 2,
        content: `Language development in autistic children can vary enormously. Some autistic children develop speech typically or even early; others have delayed speech; some remain non-speaking throughout their lives. Language differences in ASD are not just about vocabulary — they include how language is used for communication.

**Key language milestones to be aware of:**
- 12 months: First words (mama, dada, common object names)
- 18 months: Around 20 words; beginning to combine sounds into proto-words
- 24 months: 50+ words; starting to combine two words
- 36 months: 3-word sentences; strangers can understand about 75% of speech

**Language patterns that may indicate a need for further exploration:**
- Regression in language (child loses words they previously used)
- Echolalia — repeating words, phrases, or whole chunks of heard speech (from TV, adults etc.)
- Using memorised scripts rather than spontaneous language
- Speaking "at" rather than "with" people
- Difficulty with pronouns (e.g., referring to self as "you" rather than "I")
- Unusual intonation or rhythm of speech
- Very literal interpretation of language
- Difficulty understanding questions or instructions

**Echolalia:**
Echolalia is the repetition of heard language. It can be immediate (echoing what was just said) or delayed (repeating phrases heard hours or days ago). While echolalia can be a normal part of early language development, persistent echolalia beyond age 3 is worth noting. Echolalia can also be *functional* — a way of communicating — and should not automatically be suppressed.

**Non-speaking children:**
Some autistic children are non-speaking or minimally verbal. This does not mean they have nothing to communicate. Many non-speaking autistic people communicate through AAC (Augmentative and Alternative Communication) such as picture cards, symbol boards, or speech-generating devices.`,
        quizQuestions: [
          {
            id: 'q-2-2-1',
            question: 'What is echolalia?',
            options: JSON.stringify([
              'The ability to mimic sounds heard in nature',
              'Repeating words or phrases heard from others',
              'Unusually loud speech',
              'Speaking in a monotone voice',
            ]),
            correctAnswer: 'Repeating words or phrases heard from others',
            explanation:
              'Echolalia is the repetition of heard language — either immediately after hearing it, or hours/days later (delayed echolalia). It is common in autistic children and can sometimes be a functional communication strategy.',
          },
          {
            id: 'q-2-2-2',
            question: 'Which of the following language patterns is particularly significant to note?',
            options: JSON.stringify([
              'A child who develops speech slightly later than peers but catches up',
              'A child who loses words they previously used (language regression)',
              'A child who has a larger vocabulary than average',
              'A child who prefers speaking in sentences to single words',
            ]),
            correctAnswer: 'A child who loses words they previously used (language regression)',
            explanation:
              'Language regression — where a child loses previously acquired words or communication skills — is a significant developmental concern and should always be discussed with a GP or health visitor promptly.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-3',
    title: 'Behaviour and Play: Patterns and Routines',
    description:
      'Learn to identify and document patterns in play, routine adherence, repetitive behaviours, and transitions. Understand what is within typical development and what may indicate a need for further support.',
    order: 3,
    lessons: [
      {
        id: 'lesson-3-1',
        title: 'Repetitive Behaviours and Stimming',
        type: 'VIDEO',
        order: 1,
        content: `Repetitive behaviours are one of the hallmarks of ASD. These can take many forms, from repetitive movements to insistence on sameness in routines. Understanding these behaviours — and their function — is essential for effective observation and support.

**Types of repetitive behaviour:**

**Motor stereotypies (stimming):**
Stimming — short for self-stimulatory behaviour — refers to repetitive physical movements or sounds. Common examples include:
- Hand-flapping (often when excited or overwhelmed)
- Body rocking
- Spinning in circles
- Finger-flicking in front of eyes
- Jumping repeatedly
- Vocalising (humming, squealing, repeating sounds)

**Why do autistic people stim?**
Stimming serves important functions. It can:
- Help regulate sensory input (calming when overwhelmed)
- Express emotion (excitement, joy, anxiety)
- Provide pleasurable sensory feedback
- Help focus attention

Stimming is not inherently harmful and should not be suppressed unless it poses a safety risk.

**Insistence on sameness:**
Many autistic children have a strong need for predictability and routine. Changes to routine can cause significant distress. Observe whether:
- The child becomes very distressed when their usual routine is disrupted
- The child insists on specific routes or sequences of activities
- Small changes (e.g., a different plate, sitting in a different chair) cause meltdowns
- The child has strong rituals around transitions

**Repetitive play:**
- Lining up toys rather than engaging in functional play
- Sorting objects by colour, size, or shape repeatedly
- Playing with a single aspect of a toy (e.g., spinning wheels on a car) rather than using it as intended
- Limited variation in play themes`,
        quizQuestions: [
          {
            id: 'q-3-1-1',
            question: 'What is "stimming"?',
            options: JSON.stringify([
              'A type of speech therapy technique',
              'Self-stimulatory repetitive behaviour that helps regulate sensory input and emotion',
              'A diagnostic test for ASD',
              'Deliberately attempting to stimulate a child\'s development',
            ]),
            correctAnswer:
              'Self-stimulatory repetitive behaviour that helps regulate sensory input and emotion',
            explanation:
              'Stimming (self-stimulatory behaviour) refers to repetitive movements or sounds that serve a self-regulatory function. It is common in autistic people and should be understood rather than automatically suppressed.',
          },
          {
            id: 'q-3-1-2',
            question: 'A child becomes very distressed when their usual bedtime routine changes by 10 minutes. This is an example of:',
            options: JSON.stringify([
              'Naughtiness or attention-seeking behaviour',
              'Insistence on sameness, a common feature of ASD',
              'Anxiety disorder unrelated to ASD',
              'Typical toddler behaviour that should be ignored',
            ]),
            correctAnswer: 'Insistence on sameness, a common feature of ASD',
            explanation:
              'Insistence on sameness and distress at routine changes are common features of ASD. While all children can be creatures of habit, the intensity and frequency of this distress is worth noting and recording.',
          },
        ],
      },
      {
        id: 'lesson-3-2',
        title: 'Play Development and Imaginative Play',
        type: 'TEXT',
        order: 2,
        content: `Play is how children learn. The way a child plays provides important insight into their developmental stage and social understanding. Differences in play are one of the most observable early signs that may warrant further exploration.

**Typical play development stages:**
- 0-12 months: Sensory exploration — mouthing, banging, shaking toys
- 12-18 months: Functional play — using objects for their intended purpose (pretending to drink from a cup)
- 18 months - 3 years: Symbolic play begins — a banana becomes a phone, a box becomes a car
- 2-3 years: Simple pretend play with others; beginning of role play
- 3-4 years: Complex imaginative play with peers, negotiating roles and scenarios
- 4-5 years: Rich, collaborative imaginative play; story-based scenarios

**Play patterns that may indicate a need for further exploration:**

**Limited pretend / imaginative play:**
Some autistic children show reduced symbolic or pretend play. Rather than imaginative scenarios, play may be more systematic or sensory-focused.

**Functional play with specific interests:**
Very focused interest in one type of object or theme — trains, numbers, dinosaurs — with less interest in varied play.

**Solitary play preference:**
A strong preference for playing alone, even when peers are available and welcoming.

**Difficulty with flexible play:**
Insisting that play follows specific rules or sequences that the child has determined; distress when other children want to play differently.

**Observation tips:**
When observing play, note:
- Does the child initiate play with other children?
- Can the child adapt their play when a peer suggests something different?
- Does the child engage in pretend / symbolic play?
- Does the child's play have themes and narrative, or is it repetitive and systematic?`,
        quizQuestions: [
          {
            id: 'q-3-2-1',
            question: 'At approximately what age would you expect a child to begin symbolic play (e.g., using a banana as a phone)?',
            options: JSON.stringify([
              '6-9 months',
              '12-18 months',
              '18 months - 3 years',
              '4-5 years',
            ]),
            correctAnswer: '18 months - 3 years',
            explanation:
              'Symbolic play — where one object stands for another — typically begins around 18 months and develops through age 3. Limited symbolic play beyond this age is worth noting.',
          },
          {
            id: 'q-3-2-2',
            question: 'Which of the following play behaviours might be worth recording as an observation?',
            options: JSON.stringify([
              'A 5-year-old who enjoys playing with peers at school',
              'A 3-year-old who lines up all toys in a row rather than playing imaginatively',
              'A 2-year-old who prefers playing with adults to other children',
              'A 4-year-old who has a favourite toy they carry everywhere',
            ]),
            correctAnswer: 'A 3-year-old who lines up all toys in a row rather than playing imaginatively',
            explanation:
              'Lining up objects rather than engaging in functional or imaginative play is a repetitive behaviour pattern worth recording, particularly in a 3-year-old where imaginative play would typically be emerging.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-4',
    title: 'Sensory Processing Differences',
    description:
      'Understand how sensory processing differences manifest in autistic children. Learn to identify both hypersensitivity and hyposensitivity across all sensory systems.',
    order: 4,
    lessons: [
      {
        id: 'lesson-4-1',
        title: 'The Eight Senses and ASD',
        type: 'VIDEO',
        order: 1,
        content: `Most people are familiar with the five senses — sight, sound, touch, taste, and smell. But there are actually eight sensory systems, and all of them can be affected differently in autistic individuals.

**The eight sensory systems:**

1. **Visual (sight)** — Processing light, colour, movement, and visual detail
2. **Auditory (hearing)** — Processing sound, volume, pitch, and background noise
3. **Tactile (touch)** — Processing pressure, texture, temperature, and pain
4. **Gustatory (taste)** — Processing flavour, temperature, and texture in the mouth
5. **Olfactory (smell)** — Processing scents and odours
6. **Vestibular (balance/movement)** — Processing movement, gravity, and spatial orientation
7. **Proprioceptive (body awareness)** — Processing body position, muscle tension, and force
8. **Interoceptive (internal body signals)** — Processing hunger, thirst, temperature, pain, heartbeat

**Hypersensitivity vs Hyposensitivity:**
Autistic people can be *hypersensitive* (over-responsive) or *hyposensitive* (under-responsive) to any of these senses — and can be both at different times or in different contexts.

**Examples of hypersensitivity:**
- Covering ears when others can't hear a sound
- Distress at clothing labels or seams
- Extreme food refusal due to texture
- Distress in brightly lit environments

**Examples of hyposensitivity:**
- Seeking deep pressure (crashing into furniture, tight hugs)
- Not appearing to notice pain from falls or injuries
- Seeking extreme sensory input (spinning, jumping)
- Putting inedible objects in mouth (beyond typical developmental age)

**Sensory seeking:**
Some children seek out intense sensory input to satisfy their nervous system's needs. This can look like:
- Spinning repeatedly
- Crashing into soft furnishings
- Making loud repetitive noises
- Seeking very tight clothing or blankets`,
        quizQuestions: [
          {
            id: 'q-4-1-1',
            question: 'How many sensory systems are there?',
            options: JSON.stringify(['5', '6', '7', '8']),
            correctAnswer: '8',
            explanation:
              'Beyond the traditional five senses, there are also vestibular (balance/movement), proprioceptive (body awareness), and interoceptive (internal body signals) systems — making eight in total.',
          },
          {
            id: 'q-4-1-2',
            question: 'A child seeks out tight hugs, crashes into soft furnishings, and prefers very heavy blankets. This is an example of:',
            options: JSON.stringify([
              'Hypersensitivity to proprioceptive input',
              'Hyposensitivity (sensory seeking) for proprioceptive input',
              'Visual hypersensitivity',
              'Auditory hyposensitivity',
            ]),
            correctAnswer: 'Hyposensitivity (sensory seeking) for proprioceptive input',
            explanation:
              "Seeking deep pressure — hugs, crashing, heavy blankets — indicates the child's proprioceptive system needs more input than typical. This is hyposensitivity or sensory seeking behaviour.",
          },
        ],
      },
      {
        id: 'lesson-4-2',
        title: 'Observing and Recording Sensory Behaviours',
        type: 'TEXT',
        order: 2,
        content: `Sensory differences can significantly affect a child's ability to participate in daily activities, learning, and social interactions. Learning to observe and document these differences systematically helps build a clear picture for healthcare professionals.

**What to observe:**

**In the home setting:**
- Does the child respond unusually to household sounds (vacuum cleaner, hand dryer, alarms)?
- Does the child refuse certain foods based on texture or smell?
- Does the child remove clothing items (especially socks, labels, seams)?
- Does the child seek out or avoid physical contact?
- Does the child appear unaware of pain when injured?
- Does the child seek spinning, rocking, or crashing behaviours?

**In the nursery/school setting:**
- Does the child struggle in noisy environments (dining hall, playground)?
- Does the child cover ears or show distress at fire drills or sudden sounds?
- Does the child have strong reactions to the smell of food, art materials, or cleaning products?
- Does the child avoid or seek out messy play (sand, water, paint)?
- Does the child have a very narrow range of acceptable foods?

**Recording sensory observations:**
When recording, include:
- The specific trigger (e.g., "the sound of the hand dryer")
- The response observed (e.g., "covered ears, started crying, left the bathroom")
- The frequency (how often does this happen?)
- The context (is this consistent or variable?)

**Important considerations:**
- Sensory differences exist on a spectrum and change with age, environment, and stress levels
- Many non-autistic children have sensory sensitivities — the pattern and intensity matter
- Sensory differences can cause significant distress and are not "naughty" behaviour
- Occupational therapists with sensory integration training can provide specialist assessment and support`,
        quizQuestions: [
          {
            id: 'q-4-2-1',
            question: 'When recording a sensory observation, which information is most useful to include?',
            options: JSON.stringify([
              'The child\'s mood that morning',
              'The specific trigger, the response observed, and the frequency',
              'Whether the behaviour happened at home or at school',
              'How the caregiver responded to the behaviour',
            ]),
            correctAnswer: 'The specific trigger, the response observed, and the frequency',
            explanation:
              'Useful sensory observations include the specific trigger, the observed response, and how frequently it occurs. This helps identify patterns and provides meaningful information for healthcare professionals.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-5',
    title: 'Next Steps: Referrals, Support, and Self-Care',
    description:
      'Guidance on the UK referral pathway, how to prepare for appointments, understanding Education, Health and Care Plans (EHCPs), and looking after your own wellbeing as a caregiver.',
    order: 5,
    lessons: [
      {
        id: 'lesson-5-1',
        title: 'Navigating the UK Assessment Pathway',
        type: 'TEXT',
        order: 1,
        content: `Understanding how the UK diagnostic pathway works can help caregivers feel more prepared and empowered. The pathway varies somewhat by local area, but the general structure is consistent across England, Scotland, Wales, and Northern Ireland.

**Step 1: Raise concerns with your GP or health visitor**
Start by speaking to the child's GP or health visitor. Bring your documented observations — the more specific and consistent your records, the better. Describe what you've observed, when, and how frequently.

Your GP may:
- Refer directly to a community paediatrician
- Refer to the local autism assessment service
- Refer to speech and language therapy
- Suggest a hearing test to rule out hearing difficulties

**Step 2: Referral to assessment services**
In most areas of the UK, ASD assessments are carried out by a multi-disciplinary team (MDT) which may include:
- A community paediatrician or child psychiatrist
- A speech and language therapist
- An educational psychologist
- A clinical psychologist or specialist nurse

Waiting times for ASD assessment vary significantly across the UK — from a few months to several years. While waiting, document observations consistently using tools like this app.

**Step 3: The assessment**
The assessment typically involves:
- Parental/caregiver interview (detailed developmental history)
- Structured observation of the child
- Cognitive and communication assessments
- Information from school or nursery (SENCO report)

**Step 4: Outcome**
- The MDT will meet to discuss findings
- Parents will receive a report with recommendations
- A diagnosis may or may not be given
- Even without a formal ASD diagnosis, children may receive support recommendations

**Step 5: Post-diagnosis support**
Following diagnosis, families can access:
- An Education, Health and Care Plan (EHCP) if the child has significant educational needs
- Local support groups and charities
- Specialist services (CAMHS, speech therapy, OT)
- Benefits and allowances (Disability Living Allowance)

**Useful organisations:**
- National Autistic Society (autism.org.uk)
- Ambitious About Autism (ambitiousaboutautism.org.uk)
- Autism Alliance UK
- Local authority SEND team`,
        quizQuestions: [
          {
            id: 'q-5-1-1',
            question: 'What is the typical first step if a caregiver has concerns about a child\'s development in the UK?',
            options: JSON.stringify([
              'Contacting CAMHS directly',
              'Requesting an EHCP from the local authority',
              'Speaking with the child\'s GP or health visitor',
              'Arranging a private assessment',
            ]),
            correctAnswer: "Speaking with the child's GP or health visitor",
            explanation:
              "The first step is usually speaking with the GP or health visitor. They can make appropriate referrals and provide guidance. Bring your documented observations to this appointment.",
          },
          {
            id: 'q-5-1-2',
            question: 'What does EHCP stand for?',
            options: JSON.stringify([
              'Early Help and Child Protection',
              'Education, Health and Care Plan',
              'Enhanced Health and Community Provision',
              'Early Help and Coordination Plan',
            ]),
            correctAnswer: 'Education, Health and Care Plan',
            explanation:
              'An EHCP (Education, Health and Care Plan) is a legal document for children with significant special educational needs and/or disabilities that outlines the support they should receive.',
          },
        ],
      },
      {
        id: 'lesson-5-2',
        title: 'Caregiver Wellbeing and Resilience',
        type: 'TEXT',
        order: 2,
        content: `Supporting a child who may have additional needs can be rewarding, but it can also be exhausting, stressful, and emotionally demanding. Looking after your own wellbeing is not a luxury — it is essential for being able to provide the best care.

**Common challenges caregivers face:**
- Anxiety about the child's future
- Stress during the assessment waiting period
- Grief or adjustment following a diagnosis
- Navigating complex systems (NHS, schools, local authority)
- Explaining the child's needs to extended family
- Managing meltdowns and challenging behaviour
- Sleep deprivation (many autistic children have sleep difficulties)
- Financial pressure (increased costs, reduced working hours)

**The importance of support:**
Research consistently shows that caregiver wellbeing directly affects child outcomes. A caregiver who is supported, rested, and connected is better able to provide consistent, calm, responsive care.

**Practical self-care strategies:**
- **Connect with others:** Peer support groups for parents of autistic children can be enormously helpful. Others understand what you're going through.
- **Accept help:** Allow family and friends to assist. You do not need to do everything alone.
- **Communicate with your employer:** If you need flexible working arrangements, know your rights.
- **Access your own GP:** Caregiver stress and burnout are real. Talk to your GP if you are struggling.
- **Take breaks:** Respite care can be arranged through the local authority or third-sector organisations.

**Supporting siblings:**
Siblings of children with additional needs may need extra attention, reassurance, and explanation. Age-appropriate conversations about autism can help siblings understand and build empathy.

**Remember:**
A diagnosis does not change who a child is. It can open doors to support, provide explanation for challenges, and connect families with others who understand. Many autistic children and adults live full, joyful, and fulfilling lives.`,
        quizQuestions: [
          {
            id: 'q-5-2-1',
            question: 'Why is caregiver wellbeing described as essential rather than a luxury?',
            options: JSON.stringify([
              'Because caregivers deserve a break',
              'Because caregiver wellbeing directly affects the quality of care and child outcomes',
              'Because it is a legal requirement',
              'Because it reduces NHS costs',
            ]),
            correctAnswer:
              'Because caregiver wellbeing directly affects the quality of care and child outcomes',
            explanation:
              'Research shows that supported, well caregivers are better able to provide consistent, calm, and responsive care. Caregiver burnout can negatively impact the child, so self-care is genuinely important.',
          },
        ],
      },
    ],
  },
]

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@asdawareness.org.uk' },
    update: {},
    create: {
      email: 'admin@asdawareness.org.uk',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create demo caregiver user
  const caregiverPassword = await bcrypt.hash('demo123', 12)
  const caregiver = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Sarah Thompson',
      password: caregiverPassword,
      role: 'CAREGIVER',
    },
  })
  console.log('Created demo caregiver:', caregiver.email)

  // Seed training progress records for demo user
  for (const module of trainingModules) {
    for (const lesson of module.lessons) {
      for (const question of lesson.quizQuestions) {
        // We store quiz questions in training progress
        await prisma.trainingProgress.upsert({
          where: {
            userId_moduleId_lessonId: {
              userId: caregiver.id,
              moduleId: module.id,
              lessonId: lesson.id,
            },
          },
          update: {},
          create: {
            userId: caregiver.id,
            moduleId: module.id,
            lessonId: lesson.id,
            completed: false,
          },
        })
      }
    }
  }

  // Seed demo child under the demo caregiver
  const demoChild = await prisma.child.upsert({
    where: { id: 'demo-child-jamie' },
    update: {},
    create: {
      id: 'demo-child-jamie',
      name: 'Jamie Collins',
      dateOfBirth: new Date('2021-09-14'), // ~4.5 years old
      notes: 'Jamie is a bright and curious child who loves trains and numbers. Has been attending nursery since age 2. Staff have noted some differences in social play and transitions.',
      userId: caregiver.id,
    },
  })
  console.log('Created demo child:', demoChild.name)

  // Observations spread across domains and dates
  const demoObservations = [
    // Social communication
    {
      childId: demoChild.id,
      date: new Date('2026-01-08'),
      behaviourType: 'Limited eye contact during shared play',
      domain: 'SOCIAL_COMMUNICATION' as const,
      frequency: 'OFTEN' as const,
      context: 'NURSERY' as const,
      notes: 'During group story time Jamie rarely looked at the practitioner when spoken to directly. Focused on a toy train throughout.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-01-15'),
      behaviourType: 'Delayed response to name',
      domain: 'SOCIAL_COMMUNICATION' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'When called from another room Jamie did not respond on first or second call. Responded on the third attempt after direct touch.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-01-22'),
      behaviourType: 'Reduced declarative pointing',
      domain: 'SOCIAL_COMMUNICATION' as const,
      frequency: 'SOMETIMES' as const,
      context: 'OUTDOORS' as const,
      notes: 'During a walk, a dog ran past. Jamie did not point to share the experience or look back to check I had seen it. No bid for shared attention.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-02-03'),
      behaviourType: 'Echolalia — repeating TV phrases',
      domain: 'SOCIAL_COMMUNICATION' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'Jamie frequently uses phrases from favourite programmes (e.g. "The doors are closing") in unrelated contexts. Does not appear to use these communicatively.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-02-18'),
      behaviourType: 'Difficulty with back-and-forth conversation',
      domain: 'SOCIAL_COMMUNICATION' as const,
      frequency: 'OFTEN' as const,
      context: 'NURSERY' as const,
      notes: 'When peers tried to engage Jamie in role play, Jamie did not respond to their narrative. Continued own parallel play with trains.',
    },
    // Behaviour and play
    {
      childId: demoChild.id,
      date: new Date('2026-01-10'),
      behaviourType: 'Lining up toys in precise rows',
      domain: 'BEHAVIOUR_AND_PLAY' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'Every evening Jamie lines up all toy trains in order of size on the windowsill. Becomes very distressed if the order is changed.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-01-19'),
      behaviourType: 'Distress at routine change',
      domain: 'BEHAVIOUR_AND_PLAY' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'Bath time was moved 30 minutes earlier due to a family commitment. Jamie became extremely distressed (screaming, floor-dropping) for approximately 20 minutes.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-02-05'),
      behaviourType: 'Repetitive hand-flapping when excited',
      domain: 'BEHAVIOUR_AND_PLAY' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'When a favourite programme starts, Jamie flaps both hands rapidly for several seconds. Also occurs when discussing trains.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-02-12'),
      behaviourType: 'Limited imaginative play',
      domain: 'BEHAVIOUR_AND_PLAY' as const,
      frequency: 'OFTEN' as const,
      context: 'NURSERY' as const,
      notes: 'In free play Jamie does not engage in pretend scenarios. Prefers to sort and arrange objects. Does not engage with the role play corner.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-03-01'),
      behaviourType: 'Insistence on specific seat at mealtimes',
      domain: 'BEHAVIOUR_AND_PLAY' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'Jamie will only eat from a specific blue bowl, sitting in the same chair. Refused to eat for 40 minutes when the bowl was in the dishwasher.',
    },
    // Sensory responses
    {
      childId: demoChild.id,
      date: new Date('2026-01-13'),
      behaviourType: 'Hypersensitivity to hand dryer noise',
      domain: 'SENSORY_RESPONSES' as const,
      frequency: 'OFTEN' as const,
      context: 'OUTDOORS' as const,
      notes: 'In a public toilet Jamie screamed and covered ears when the hand dryer activated. Remained distressed for 10 minutes after leaving.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-01-27'),
      behaviourType: 'Refusal of textured foods',
      domain: 'SENSORY_RESPONSES' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'Diet is very restricted — smooth foods only. Strong gag response to any lumpy or mixed-texture food. Currently eating fewer than 10 foods.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-02-09'),
      behaviourType: 'Seeks deep pressure / tight clothing',
      domain: 'SENSORY_RESPONSES' as const,
      frequency: 'SOMETIMES' as const,
      context: 'HOME' as const,
      notes: 'Jamie requests very tight hugs frequently and insists on wearing clothing a size too small. Appears calmer when wrapped tightly in a blanket.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-02-24'),
      behaviourType: 'Distress at clothing labels and seams',
      domain: 'SENSORY_RESPONSES' as const,
      frequency: 'OFTEN' as const,
      context: 'HOME' as const,
      notes: 'Spends up to 15 minutes each morning distressed by socks seams. Clothing labels have been removed from all garments. Will not wear jeans.',
    },
    {
      childId: demoChild.id,
      date: new Date('2026-03-10'),
      behaviourType: 'Unusual pain response — apparent indifference to injury',
      domain: 'SENSORY_RESPONSES' as const,
      frequency: 'SOMETIMES' as const,
      context: 'OUTDOORS' as const,
      notes: 'Jamie fell from climbing frame and sustained a graze. No crying or apparent distress. Carried on playing. Noticed injury 20 minutes later.',
    },
  ]

  for (const obs of demoObservations) {
    await prisma.observation.create({ data: obs })
  }
  console.log(`Created ${demoObservations.length} demo observations`)

  // AI insight for the demo child
  await prisma.aiInsight.create({
    data: {
      childId: demoChild.id,
      generatedAt: new Date('2026-03-15'),
      summary: `Over the observed period (January–March 2026), Jamie (age 4, 6 months) shows a consistent pattern of differences across all three observation domains: social communication, behaviour and play, and sensory processing. The frequency and consistency of these observations across both home and nursery settings is notable.`,
      patterns: `Social communication: Reduced joint attention behaviours are consistently observed — Jamie rarely points to share interest and does not look back to check for shared experience. Delayed response to name and limited back-and-forth exchange are reported frequently across contexts. Echolalia (repeating TV phrases) is present and appears non-functional.\n\nBehaviour and play: A strong preference for sameness and routine is evident, with significant distress when routines are disrupted. Repetitive behaviours including lining up objects and hand-flapping are observed regularly. Imaginative and pretend play appears absent; play is predominantly sensory-exploratory or systematic.\n\nSensory processing: Hypersensitivity to auditory input (particularly sudden loud noises) and tactile input (seams, food textures) is documented across multiple observations. Simultaneous sensory-seeking behaviour (deep pressure, tight clothing) suggests a complex sensory profile rather than uniform over- or under-sensitivity.`,
      recommendations: `These observations present a consistent pattern that warrants further professional exploration. The following steps are recommended:\n\n1. Discuss these documented observations with Jamie's GP or health visitor at the next available appointment. Bring printed copies of the observation records.\n\n2. Request a referral to the community paediatric team or local autism assessment service. Note that waiting times in many areas exceed 12 months — early referral is advisable.\n\n3. Speak with the nursery SENCO (Special Educational Needs Coordinator) about Jamie's observed differences. The nursery can provide a professional SENCO report which will support any formal assessment.\n\n4. Consider a referral to Speech and Language Therapy for assessment of Jamie's communication profile, particularly the echolalia and limited conversational exchange.\n\n5. An Occupational Therapy (sensory integration) referral may be helpful given the significant sensory differences noted, particularly the food selectivity and tactile sensitivities.\n\nPlease remember: these observations do not constitute a diagnosis. Many children display some of these behaviours. The pattern, frequency, and consistency across multiple settings is what makes these observations worth sharing with healthcare professionals.`,
      disclaimer: 'This is not a diagnosis. This tool supports observation and pattern recognition only. Always consult a qualified healthcare professional.',
    },
  })
  console.log('Created demo AI insight')

  // Mark first 2 modules complete for demo caregiver
  const completedModules = trainingModules.slice(0, 2)
  for (const module of completedModules) {
    for (const lesson of module.lessons) {
      await prisma.trainingProgress.upsert({
        where: {
          userId_moduleId_lessonId: {
            userId: caregiver.id,
            moduleId: module.id,
            lessonId: lesson.id,
          },
        },
        update: { completed: true, completedAt: new Date('2026-02-20') },
        create: {
          userId: caregiver.id,
          moduleId: module.id,
          lessonId: lesson.id,
          completed: true,
          completedAt: new Date('2026-02-20'),
        },
      })
    }
  }
  console.log('Marked first 2 training modules complete for demo caregiver')

  console.log('\nSeeding complete!')
  console.log('\nDemo credentials:')
  console.log('  Email: demo@example.com  /  Password: demo123')
  console.log('\nAdmin credentials:')
  console.log('  Email: admin@asdawareness.org.uk  /  Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
