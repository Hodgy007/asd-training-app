import { QuizQuestion, Lesson, TrainingModule } from './training-data'

export interface CareerLesson extends Lesson {}
export interface CareerModule extends TrainingModule {}

export function getCareerModuleById(moduleId: string): CareerModule | undefined {
  return CAREERS_MODULES.find((m) => m.id === moduleId)
}

export function getCareerLessonById(
  moduleId: string,
  lessonId: string
): CareerLesson | undefined {
  const module = getCareerModuleById(moduleId)
  return module?.lessons.find((l) => l.id === lessonId)
}

export const CAREERS_MODULES: CareerModule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 1
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'careers-module-1',
    title: 'Understanding Autism in the Careers Context',
    description:
      'Build a confident foundation in autism awareness as it applies to careers education — what autism is, why the employment gap matters, and how a strengths-based approach transforms outcomes.',
    order: 1,
    lessons: [
      {
        id: 'careers-1-1',
        moduleId: 'careers-module-1',
        title: 'What Is Autism? Key Characteristics Relevant to Careers Education',
        type: 'TEXT',
        order: 1,
        content: `Autism Spectrum Disorder (ASD) is a lifelong neurodevelopmental condition characterised by differences in social communication, sensory processing, and patterns of thought and behaviour. The word "spectrum" reflects the enormous diversity of autistic experience — no two autistic people are the same, and the way autism presents in a 14-year-old navigating work experience looks very different from how it presents in a 30-year-old professional.

For careers professionals, the most practically relevant characteristics fall into four areas. **Social communication differences** may mean that an autistic young person struggles with unwritten social rules in interviews — such as maintaining appropriate eye contact, interpreting ambiguous questions, or reading the emotional subtext of feedback. These are not deficits in intelligence or ambition; they are differences in how social information is processed.

**Sensory sensitivities** are frequently overlooked in careers planning. Open-plan offices, fluorescent lighting, strong smells in catering environments, and the unpredictable noise of busy workplaces can be genuinely distressing for autistic young people. Understanding this dimension helps careers leaders identify suitable work experience placements and employer partners, and to advise young people on how to advocate for reasonable adjustments.

**Preference for predictability and routine** means that the inherent uncertainty of job searching, interviews, and starting a new role can be particularly anxiety-provoking. Clear structure, written instructions, and staged preparation are not "special treatment" — they are effective careers education practice for autistic learners. Finally, **highly focused interests and expertise** are often among the most significant career assets autistic young people bring. Many autistic people develop exceptional depth of knowledge in areas of genuine interest, which — when channelled well — can be a powerful differentiator in the labour market.`,
        quizQuestions: [
          {
            id: 'cq-1-1-1',
            question: 'Which of the following best describes why sensory sensitivities are relevant to careers planning?',
            options: [
              'They are a medical issue that careers leaders should not address',
              'They can affect suitability of work experience placements and working environments',
              'They only affect autistic people with a formal diagnosis',
              'They are usually resolved before a young person reaches secondary school',
            ],
            correctAnswer: 'They can affect suitability of work experience placements and working environments',
            explanation: 'Sensory sensitivities can significantly affect how comfortable and sustainable a working environment is for an autistic young person — making them directly relevant to careers guidance and placement decisions.',
          },
          {
            id: 'cq-1-1-2',
            question: 'An autistic young person struggles to maintain eye contact during a mock interview. This most likely reflects:',
            options: [
              'A lack of confidence that needs to be corrected',
              'A social communication difference, not a deficit in ability or motivation',
              'A sign that they are not ready for work experience',
              'A behaviour that careers leaders cannot support',
            ],
            correctAnswer: 'A social communication difference, not a deficit in ability or motivation',
            explanation: 'Difficulty with eye contact is a common social communication difference in autism. It does not indicate low ability or lack of motivation, and careers leaders can help young people understand and navigate this in professional contexts.',
          },
        ],
      },
      {
        id: 'careers-1-2',
        moduleId: 'careers-module-1',
        title: 'The Employment Gap — Statistics, Barriers, and What the Evidence Says',
        type: 'TEXT',
        order: 2,
        content: `The scale of autistic unemployment in the UK is one of the most stark inequalities in the labour market. Only **22% of autistic adults are in paid employment** — the lowest employment rate of any disability group tracked by the Office for National Statistics. This is not a reflection of autistic people's capability or willingness to work; it is a systems failure that begins, in many cases, in the careers education young people receive (or don't receive) during their secondary years.

The pipeline problem is visible much earlier than adulthood. In some local authority areas, **NEET (Not in Education, Employment or Training) rates for autistic 16–24 year olds exceed 40%** — a figure that should alarm every careers professional working with SEND young people. The transition from school to post-16 provision, and from there to employment or further study, is the moment at which careers guidance can most powerfully intervene. Yet research consistently shows that autistic young people are among those least likely to receive high-quality, personalised careers guidance during this period.

The economic consequences of this gap are substantial. Research from the London School of Economics estimates the economic cost of autistic unemployment and underemployment at **£32 billion per year**, accounting for lost productivity, welfare costs, and the broader economic inactivity of autistic adults who want to work but cannot find or sustain suitable employment.

**Why does the gap persist?** The barriers are multiple and intersecting. Employers often lack the awareness to create accessible recruitment processes. Schools and colleges may not have careers leaders with sufficient SEND expertise. Autistic young people themselves may struggle with the self-advocacy skills needed to navigate a system that was not designed with their needs in mind. And the transition planning process — particularly around EHCPs — is often poorly coordinated between education, health, and employment services. Careers professionals who understand this landscape are uniquely positioned to help break this cycle.`,
        quizQuestions: [
          {
            id: 'cq-1-2-1',
            question: 'What percentage of autistic adults are in paid employment, according to ONS data?',
            options: ['22%', '45%', '60%', '38%'],
            correctAnswer: '22%',
            explanation: '22% is the ONS-tracked figure for autistic adult employment — the lowest of any disability group, highlighting the urgent need for targeted careers education and employer engagement.',
          },
          {
            id: 'cq-1-2-2',
            question: 'Which of the following is NOT identified as a key barrier to autistic employment?',
            options: [
              'Inaccessible recruitment processes',
              'Lack of SEND expertise among careers professionals',
              'Low intelligence among autistic young people',
              'Poor transition planning between education and employment services',
            ],
            correctAnswer: 'Low intelligence among autistic young people',
            explanation: 'Low intelligence is not a barrier — autistic people span the full range of cognitive ability. The real barriers are structural and systemic: inaccessible employers, undertrained careers professionals, and poor transition planning.',
          },
        ],
      },
      {
        id: 'careers-1-3',
        moduleId: 'careers-module-1',
        title: 'Strengths-Based Approaches in Careers Guidance',
        type: 'TEXT',
        order: 3,
        content: `A strengths-based approach to careers guidance shifts the focus from what a young person cannot do to what they can — and does so not as an exercise in positivity, but as a rigorous method for identifying genuine competitive advantage in the labour market. For autistic young people, this shift can be transformative.

Many autistic people bring distinctive strengths that are highly valued by employers: exceptional attention to detail, deep expertise in areas of passionate interest, high levels of reliability and consistency, pattern recognition, and honest, direct communication. In sectors such as technology, data analysis, research, creative industries, and skilled trades, these strengths are not just acceptable — they are actively sought. The careers professional's role is to help young people identify, articulate, and evidence these strengths in the context of real career options.

**Practical approaches** to strengths-based guidance with autistic young people include structured self-assessment exercises that move beyond vague questions ("what are you good at?") to concrete, specific prompts linked to activities, subjects, and past successes. It also means taking a young person's areas of passionate interest seriously as career entry points, rather than dismissing them as niche or unlikely. A deep interest in railways, for instance, is not just a hobby — it is evidence of research skills, sustained attention, and domain expertise that may be directly relevant to engineering, operations, or heritage sectors.

It is equally important to be honest about challenges without framing them as disqualifying. An autistic young person who finds unstructured social interaction exhausting does not need to be directed away from all people-facing roles — they need support to identify working styles, environments, and reasonable adjustments that make those roles sustainable. Strengths-based guidance is not about telling young people what they want to hear; it is about helping them build a realistic, evidence-based picture of where they can thrive.`,
        quizQuestions: [
          {
            id: 'cq-1-3-1',
            question: 'A strengths-based approach to careers guidance primarily involves:',
            options: [
              'Only discussing positive attributes and ignoring challenges',
              'Identifying genuine competitive advantages and building realistic career pathways around them',
              'Steering autistic young people towards low-demand jobs',
              'Focusing exclusively on interests without considering labour market reality',
            ],
            correctAnswer: 'Identifying genuine competitive advantages and building realistic career pathways around them',
            explanation: 'A strengths-based approach is rigorous, not just positive — it helps young people identify real strengths, articulate them to employers, and build realistic pathways that account for both strengths and challenges.',
          },
          {
            id: 'cq-1-3-2',
            question: 'A young autistic person has an intense interest in a very specific topic. A careers professional should:',
            options: [
              'Redirect them towards more conventional career interests',
              'Explore whether this interest can serve as a career entry point and evidence relevant skills',
              'Advise them to keep this interest separate from their career planning',
              'Only discuss it if it is listed in the National Curriculum',
            ],
            correctAnswer: 'Explore whether this interest can serve as a career entry point and evidence relevant skills',
            explanation: 'Deep, focused interests often represent genuine expertise and transferable skills. Exploring their career relevance is core to strengths-based guidance with autistic young people.',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 2
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'careers-module-2',
    title: 'Autism-Inclusive Careers Planning',
    description:
      'Develop practical skills for adapting careers conversations, working with EHCPs and transition plans, and mapping your provision against the Gatsby Benchmarks for SEND pupils.',
    order: 2,
    lessons: [
      {
        id: 'careers-2-1',
        moduleId: 'careers-module-2',
        title: 'Adapting Careers Conversations for Autistic Young People',
        type: 'TEXT',
        order: 1,
        content: `Effective careers guidance for autistic young people begins before the conversation itself. The standard one-to-one careers interview — a 30-minute unstructured conversation with a stranger in an unfamiliar room, full of ambiguous open questions — can be a genuinely difficult experience for an autistic young person. Small adaptations to how sessions are structured, communicated, and conducted can make the difference between a conversation that is productive and one that is dominated by anxiety.

**Before the session:** Send a clear written agenda in advance. Include the questions you plan to ask — not as a test to prepare for, but as a scaffold that allows the young person to think through their answers without the cognitive pressure of on-the-spot processing. If possible, share the location and describe the room, or offer to meet in a familiar space. For young people who use a key worker, SENCO, or learning support assistant, consider whether their presence would help.

**During the session:** Use concrete, specific questions rather than open-ended abstractions. "What subjects do you most enjoy at school?" is more accessible than "What are you passionate about?" Give time for processing — autistic people often need longer to formulate verbal responses, and silence is not disengagement. Avoid metaphor and idiom ("what does your ideal job look like?") in favour of literal language ("what kind of tasks would you want to do in a job?"). Check understanding explicitly rather than assuming.

**After the session:** Provide written notes summarising what was discussed and the next steps agreed. This is good practice for all students, but it is particularly valuable for autistic young people who may find verbal information harder to retain or who benefit from having a concrete record to refer back to. Follow-up actions should be specific, time-bounded, and broken into small steps — not "research some career options" but "look at three job adverts in [sector] and note what qualifications they ask for."`,
        quizQuestions: [
          {
            id: 'cq-2-1-1',
            question: 'Why is it helpful to share planned questions with an autistic young person before a careers interview?',
            options: [
              'So they can memorise scripted answers',
              'To reduce the cognitive pressure of on-the-spot processing and allow thoughtful preparation',
              'Because it is required by law under the Equality Act',
              'It is not helpful — it reduces the authenticity of the session',
            ],
            correctAnswer: 'To reduce the cognitive pressure of on-the-spot processing and allow thoughtful preparation',
            explanation: 'Sharing questions in advance is a reasonable adjustment that respects the processing differences of autistic young people — it scaffolds the conversation without scripting it.',
          },
          {
            id: 'cq-2-1-2',
            question: 'Which of the following is the most accessible way to phrase a careers question for an autistic young person?',
            options: [
              '"Where do you see yourself in five years?"',
              '"What does success mean to you?"',
              '"What kind of tasks would you want to do in a job?"',
              '"If you could be anything, what would it be?"',
            ],
            correctAnswer: '"What kind of tasks would you want to do in a job?"',
            explanation: 'Concrete, literal questions are more accessible than metaphorical or future-oriented abstractions. Asking about specific tasks is more likely to elicit useful, actionable responses.',
          },
        ],
      },
      {
        id: 'careers-2-2',
        moduleId: 'careers-module-2',
        title: 'Working with EHCPs and Transition Planning (Year 9 Onwards)',
        type: 'TEXT',
        order: 2,
        content: `The Education, Health and Care Plan (EHCP) is the statutory framework for supporting young people with special educational needs through education and into adulthood. For autistic young people with an EHCP, the plan should include a **Preparation for Adulthood (PfA)** section that explicitly addresses employment, independent living, community participation, and health. The careers professional's relationship with the EHCP is therefore not optional — it is a core part of their professional responsibility for these young people.

**Year 9 annual review** is the point at which PfA planning must formally begin. This means that careers leaders should ideally be involved in — or at minimum informed about — Year 9 annual reviews for autistic students with EHCPs. The review should include a conversation about aspirations, identify any gaps between current provision and what will be needed to support employment aspirations, and set SMART outcomes related to employment preparation.

**The transition period (Years 9–13)** is when careers guidance can most powerfully shape trajectories. This is when post-16 options, work experience placements, supported internship routes, and employer encounters should be progressively introduced. Key actions for careers leaders include: ensuring autistic young people are included in all employer encounters and career events (not excluded on the basis that they "won't benefit"); tailoring work experience briefing and debriefing to account for the emotional intensity this experience can involve; and helping young people draft a brief profile of their strengths, preferences, and reasonable adjustments that can be shared with placement providers.

**Common gaps in current practice** include: EHCPs that identify employment as an aspiration but include no careers-related outcomes; careers guidance that happens too late (Year 11 only); and transition planning that is coordinated between school and college but not between education and employment services. Careers leaders who understand these gaps are better placed to advocate for autistic young people within the systems that shape their futures.`,
        quizQuestions: [
          {
            id: 'cq-2-2-1',
            question: 'At what year group should Preparation for Adulthood planning formally begin for young people with EHCPs?',
            options: ['Year 7', 'Year 9', 'Year 11', 'Year 13'],
            correctAnswer: 'Year 9',
            explanation: 'The SEND Code of Practice requires that PfA planning begins at Year 9 annual review. Careers leaders should be engaged with or informed about these reviews for autistic students with EHCPs.',
          },
          {
            id: 'cq-2-2-2',
            question: 'Which of the following is a common gap in transition planning for autistic young people?',
            options: [
              'Too many employer encounters in Year 7',
              'EHCPs that identify employment aspirations but include no careers-related outcomes',
              'Careers guidance that begins too early in Year 9',
              'Too much involvement from health services in transition planning',
            ],
            correctAnswer: 'EHCPs that identify employment aspirations but include no careers-related outcomes',
            explanation: 'A frequent gap is EHCPs that mention employment as a goal but do not translate this into SMART outcomes or actions — leaving career aspirations unaddressed by the plan that is supposed to coordinate support.',
          },
        ],
      },
      {
        id: 'careers-2-3',
        moduleId: 'careers-module-2',
        title: 'The Gatsby Benchmarks and SEND — What Good Looks Like for Benchmark 8',
        type: 'TEXT',
        order: 3,
        content: `The Gatsby Benchmarks provide the national framework for good careers education in England's schools and colleges. Eight benchmarks cover everything from a stable careers programme to employer encounters to personal guidance. Ofsted's Personal Development judgement draws directly on Gatsby achievement, making benchmark performance a practical inspection concern as well as a quality standard.

For SEND pupils and autistic young people specifically, **Benchmark 8 — Personal Guidance** is the most critical and also the most consistently underperformed. Benchmark 8 requires that every pupil has access to at least one individual guidance appointment with a qualified careers adviser by the age of 16, and a further appointment by the age of 18. Evidence consistently shows that SEND pupils — including autistic young people — are disproportionately less likely to have received this entitlement.

**What good looks like for Benchmark 8 with autistic young people** goes beyond simply logging that a meeting took place. Quality guidance for autistic young people means: adapted delivery (as described in the previous lesson); documented follow-up; involvement of EHCPs where applicable; and — ideally — guidance that is informed by knowledge of autism-specific barriers and strengths. A 30-minute meeting that is not adapted and leaves the young person more anxious than when they arrived does not meet the spirit of Benchmark 8.

Beyond Benchmark 8, **Benchmark 5 (Encounters with Employers and Employees)** and **Benchmark 6 (Experiences of Workplaces)** are also highly relevant. Autistic young people benefit from structured, low-pressure introductions to the world of work — employer presentations with preparation and debrief, visits to workplaces before any formal work experience, and opportunities to ask questions of autistic employees who can model what a successful working life looks like. Careers leaders who map their provision against these benchmarks with a SEND lens will identify gaps — and will have a clear, evidence-based rationale for prioritising them with senior leadership.`,
        quizQuestions: [
          {
            id: 'cq-2-3-1',
            question: 'Which Gatsby Benchmark is most directly concerned with individual careers guidance appointments?',
            options: ['Benchmark 3', 'Benchmark 5', 'Benchmark 8', 'Benchmark 6'],
            correctAnswer: 'Benchmark 8',
            explanation: 'Benchmark 8 (Personal Guidance) requires every student to have at least one individual guidance appointment with a qualified careers adviser by 16 and another by 18 — an entitlement that SEND pupils are disproportionately less likely to receive.',
          },
          {
            id: 'cq-2-3-2',
            question: 'A school records that all autistic pupils had a 30-minute careers meeting. This is sufficient to meet Benchmark 8 in spirit if:',
            options: [
              'The meeting was logged in the school\'s MIS system',
              'The guidance was adapted, followed up in writing, and informed by knowledge of the young person\'s EHCP and needs',
              'The meeting lasted exactly 30 minutes',
              'The young person\'s parent was present',
            ],
            correctAnswer: 'The guidance was adapted, followed up in writing, and informed by knowledge of the young person\'s EHCP and needs',
            explanation: 'Meeting Benchmark 8 in spirit for autistic young people means adapted delivery, documented follow-up, and EHCP-informed guidance — not just recording that a meeting occurred.',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 3
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'careers-module-3',
    title: 'Employer Engagement and Work Experience',
    description:
      'Build the knowledge and practical tools to engage autism-friendly employers, prepare young people for workplace realities, and understand supported internship and job coaching models.',
    order: 3,
    lessons: [
      {
        id: 'careers-3-1',
        moduleId: 'careers-module-3',
        title: 'Identifying Autism-Friendly Employers',
        type: 'TEXT',
        order: 1,
        content: `Not every employer is equally prepared to support autistic employees — and helping young people identify organisations that are genuinely committed to autism inclusion is a practical and valuable part of careers guidance. The good news is that there is a growing ecosystem of employer commitments and accreditations that careers leaders can use to identify, vet, and build relationships with autism-friendly employers.

The **Disability Confident scheme** provides a tiered framework of employer commitment to disability inclusion. Disability Confident Leaders (Level 3) have made significant commitments to inclusive recruitment and workplace support. While the scheme covers all disabilities, employers who have achieved Level 3 have typically developed meaningful disability inclusion practices that extend to autism.

**Autism-specific employer programmes** are increasingly common among large employers. Microsoft, GCHQ, SAP, and JPMorgan Chase have all developed autism-specific recruitment and employment pathways — often explicitly designed to bypass the traditional interview process in favour of skills-based assessment. For careers leaders, these programmes represent valuable named resources to share with young people, and also a model to hold up when approaching local employers about adapting their own processes.

When approaching new employer partners, the most effective conversations focus on **business benefit rather than charity**. Autistic employees are not a burden that employers are asked to accommodate out of goodwill — they are a talent pool that employers are currently failing to access. High retention rates, exceptional performance in detail-oriented roles, and the diversity of thought that autistic employees bring are all legitimate business arguments. Careers leaders who can make this case confidently are more likely to build durable, reciprocal partnerships than those who frame engagement as corporate social responsibility.

**Practical markers of autism-friendliness** that careers leaders can assess before placing young people include: availability of written instructions and job descriptions; flexibility on interview format; willingness to offer a workplace visit before formal placement; a named point of contact for adjustments; and evidence of neurodiversity awareness among line managers, not just HR.`,
        quizQuestions: [
          {
            id: 'cq-3-1-1',
            question: 'When approaching an employer about hiring autistic young people, which framing is most effective?',
            options: [
              'Autistic employees need extra support and employers should be prepared for this',
              'It is a legal requirement under the Equality Act',
              'Autistic employees represent an underutilised talent pool with distinctive strengths that benefit the business',
              'It is primarily a corporate social responsibility opportunity',
            ],
            correctAnswer: 'Autistic employees represent an underutilised talent pool with distinctive strengths that benefit the business',
            explanation: 'Framing autism employment as a business benefit — accessing a talented, loyal, and highly capable workforce — is more likely to build lasting employer engagement than a compliance or charity framing.',
          },
          {
            id: 'cq-3-1-2',
            question: 'Which of the following is a useful marker that a work experience placement is autism-friendly?',
            options: [
              'The employer has more than 500 employees',
              'The employer is willing to offer a workplace visit before the formal placement begins',
              'The employer is in the technology sector',
              'The employer has an HR department',
            ],
            correctAnswer: 'The employer is willing to offer a workplace visit before the formal placement begins',
            explanation: 'A pre-placement visit allows autistic young people to familiarise themselves with the environment, reducing the sensory and social unknowns that can make starting a placement so anxiety-provoking.',
          },
        ],
      },
      {
        id: 'careers-3-2',
        moduleId: 'careers-module-3',
        title: 'Preparing Young People for Workplace Disclosure',
        type: 'TEXT',
        order: 2,
        content: `Disclosure — the decision to tell an employer about an autism diagnosis — is one of the most complex and personal decisions an autistic young person will face. There is no single right answer. Careers professionals can play an important role in helping young people think through this decision in an informed, autonomous way — but must resist the temptation to advise one way or the other as a blanket position.

**The case for disclosure** is primarily practical: disclosure enables employers to put reasonable adjustments in place under the Equality Act 2010. Without disclosure, employers are not legally required to make adjustments, and the young person may struggle unnecessarily in environments that could be made more accessible with small changes. Early disclosure — at job offer stage rather than after problems arise — also allows a more proactive and collaborative conversation with employers.

**The case for non-disclosure** is equally real. Despite legal protections, discrimination on the grounds of disability — including autism — does occur in recruitment and the workplace. Some young people fear that disclosure will lead to assumptions about their capability, social exclusion, or being passed over for opportunities. These fears are not irrational, and careers leaders should not dismiss them.

**A useful framework** for supporting this decision is to help young people think through three questions: What would I need from this employer in order to thrive? Is this something I can get without disclosing? And if I were to disclose, how and when would I want to do it? This moves the conversation from a binary yes/no to a strategic, personalised plan.

**Practical preparation for disclosure conversations** includes role-playing the conversation, drafting a brief written statement that the young person can refer to, and identifying one or two specific reasonable adjustments that would make a real difference — rather than a vague request for "support." Careers leaders can also help young people connect with autistic adults who have navigated disclosure in their own careers, providing lived-experience perspective that no careers professional can fully replicate.`,
        quizQuestions: [
          {
            id: 'cq-3-2-1',
            question: 'Under the Equality Act 2010, when is an employer legally required to make reasonable adjustments for an autistic employee?',
            options: [
              'Always, regardless of disclosure',
              'Only if the employee has a formal diagnosis',
              'Once the employer is aware of the disability',
              'Only in organisations with more than 50 employees',
            ],
            correctAnswer: 'Once the employer is aware of the disability',
            explanation: 'The duty to make reasonable adjustments under the Equality Act is triggered once the employer knows, or reasonably should know, about a disability. Disclosure is therefore practically important — though the decision to disclose remains personal.',
          },
          {
            id: 'cq-3-2-2',
            question: 'A careers leader\'s role in supporting an autistic young person\'s disclosure decision is to:',
            options: [
              'Advise all autistic young people to disclose their diagnosis at application stage',
              'Advise all autistic young people not to disclose until they have started the job',
              'Help the young person think through the decision in an informed and autonomous way',
              'Make the disclosure decision on behalf of the young person',
            ],
            correctAnswer: 'Help the young person think through the decision in an informed and autonomous way',
            explanation: 'Disclosure is a personal decision with no universal right answer. The careers professional\'s role is to ensure the young person has the information and preparation to make an informed choice, not to make the decision for them.',
          },
        ],
      },
      {
        id: 'careers-3-3',
        moduleId: 'careers-module-3',
        title: 'Supported Internships and Job Coaching Models',
        type: 'TEXT',
        order: 3,
        content: `Supported internships are a structured, school or college-based study programme for young people with EHCPs aged 16–24 who want to move into employment. They combine a substantive work placement (typically three to five days a week) with personalised support from a job coach, and are delivered in partnership between education providers and employers. For many autistic young people who might not succeed in an unsupported work experience placement, supported internships represent a genuinely transformative pathway.

The **job coach** is central to the supported internship model. Their role is to be present in the workplace during the early stages of the placement, helping the young person understand the social and procedural expectations of the role, mediating with line managers, and — crucially — fading their support over time as the young person becomes more confident and competent. The goal is not dependency on the job coach but progressive independence, with the job coach acting as a bridge between the young person's current capabilities and the demands of the role.

**Project SEARCH** is the best-known and most extensively evaluated supported internship model in the UK and US. Operating in hospitals, corporations, and public sector organisations, Project SEARCH places young people with learning disabilities and autism in nine-month internships divided into three rotations, each in a different department. The model has strong evidence of employment outcomes — in some sites, 70% or more of completers move into paid employment.

**For careers leaders**, supported internships are a resource to know about, refer to, and advocate for — particularly for autistic young people whose EHCPs identify employment as a priority outcome but for whom unsupported work experience is unlikely to be a realistic first step. Key actions include: identifying which local colleges or specialist providers offer supported internship programmes; building relationships with local employers who offer placements; and ensuring that EHCP annual reviews explicitly consider whether a supported internship route is appropriate from Year 11 onwards.`,
        quizQuestions: [
          {
            id: 'cq-3-3-1',
            question: 'What is the primary role of a job coach in a supported internship?',
            options: [
              'To complete tasks on behalf of the young person',
              'To remain present throughout the entire placement at all times',
              'To provide on-site support that fades progressively as the young person builds independence',
              'To liaise with parents instead of the young person directly',
            ],
            correctAnswer: 'To provide on-site support that fades progressively as the young person builds independence',
            explanation: 'The job coaching model is built on progressive fading of support — the goal is independence, not ongoing dependency. The job coach is a bridge, not a permanent crutch.',
          },
          {
            id: 'cq-3-3-2',
            question: 'Supported internships are specifically designed for young people who:',
            options: [
              'Have achieved at least 5 GCSEs at grade 4 or above',
              'Have an EHCP and want to move into employment',
              'Have been unable to find any other employment',
              'Are aged 25 or over with a diagnosis of autism',
            ],
            correctAnswer: 'Have an EHCP and want to move into employment',
            explanation: 'Supported internships are a statutory programme for 16–24 year olds with EHCPs who have employment as a goal. They are not a last resort — they are a structured, evidence-based pathway to employment.',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE 4
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'careers-module-4',
    title: 'Collaboration and Referral Pathways',
    description:
      'Build an effective professional network by learning how to work with SENCOs, parents and EHCPs, navigate referral pathways to specialist organisations, and create a whole-school autism-inclusive careers culture.',
    order: 4,
    lessons: [
      {
        id: 'careers-4-1',
        moduleId: 'careers-module-4',
        title: 'Working with SENCOs, Parents, and EHCPs',
        type: 'TEXT',
        order: 1,
        content: `Careers guidance for autistic young people does not happen in isolation. The most effective careers leaders working with SEND pupils build strong collaborative relationships with three groups: SENCOs (Special Educational Needs Coordinators), parents and carers, and the professionals who contribute to and review EHCPs. Understanding each of these relationships — and what good collaboration looks like — is essential to ensuring autistic young people receive coherent, coordinated support.

**The SENCO relationship** is foundational. The SENCO holds the longitudinal view of the young person's needs, progress, and EHCP outcomes that the careers leader may lack. Regular communication between careers leaders and SENCOs ensures that careers guidance is informed by what is in the EHCP, that careers-related outcomes are included in EHCP reviews, and that the careers leader is aware of any significant developments in the young person's support needs. In many schools, building a joint SENCO-careers leader protocol — with clear expectations about who is informed about what, and when — can formalise a collaboration that is otherwise ad hoc.

**Parents and carers** are often the most knowledgeable people in the room about what a young autistic person needs, what motivates them, and what has or hasn't worked in the past. They are also often anxious about transition — particularly the move from school to post-16 provision and from education to employment. Careers leaders who actively involve parents in the careers guidance process — through pre-meeting briefings, shared notes, and explicit invitations to contribute — will get better outcomes than those who treat guidance as a one-to-one professional service from which parents are excluded.

**EHCP reviews** are the formal mechanism through which careers-related outcomes are set, monitored, and updated. Careers leaders who contribute written evidence to annual reviews — documenting what guidance has been provided, what the young person's aspirations are, and what next steps have been agreed — ensure that career development is embedded in the statutory framework rather than existing alongside it. This also creates an evidence trail that protects the young person's entitlement and demonstrates the value of the careers leader's contribution to SEND provision.`,
        quizQuestions: [
          {
            id: 'cq-4-1-1',
            question: 'Why is regular communication between careers leaders and SENCOs important for autistic young people?',
            options: [
              'It allows the SENCO to replace the careers leader in guidance sessions',
              'It ensures careers guidance is informed by EHCP outcomes and the young person\'s broader support needs',
              'It is required by the Gatsby Benchmarks in all cases',
              'It is primarily useful for writing Ofsted evidence',
            ],
            correctAnswer: 'It ensures careers guidance is informed by EHCP outcomes and the young person\'s broader support needs',
            explanation: 'The SENCO holds critical longitudinal knowledge about the young person\'s needs and EHCP. Careers guidance that is not informed by this is likely to be less effective and may miss or duplicate what is already planned.',
          },
          {
            id: 'cq-4-1-2',
            question: 'Contributing written evidence to an autistic young person\'s EHCP annual review helps careers leaders to:',
            options: [
              'Take over from the SENCO in coordinating the review',
              'Ensure career development is embedded in the statutory framework and documented',
              'Reduce the amount of direct guidance time required',
              'Transfer responsibility for careers outcomes to the local authority',
            ],
            correctAnswer: 'Ensure career development is embedded in the statutory framework and documented',
            explanation: 'Written contributions to EHCP reviews ensure that careers-related outcomes are formally recorded, monitored, and updated — embedding careers guidance in the plan that drives coordinated support.',
          },
        ],
      },
      {
        id: 'careers-4-2',
        moduleId: 'careers-module-4',
        title: 'Referral Pathways — NAS, AET, and Ambitious about Autism',
        type: 'TEXT',
        order: 2,
        content: `No careers leader is expected to be an expert in everything. Knowing when and how to refer autistic young people and their families to specialist organisations is as important a professional skill as the guidance itself. The UK autism landscape includes several organisations with distinct remits that careers leaders should be familiar with.

The **National Autistic Society (NAS)** is the UK's leading charity for autistic people and their families. Its Prospects employment service is specifically designed to support autistic adults into employment, offering one-to-one employment support, employer engagement, and job matching. For young people approaching the end of their education, a warm referral to NAS Prospects — with a handover of relevant information about the young person's strengths and support needs — can provide continuity of support through the transition to adulthood.

The **Autism Education Trust (AET)** focuses primarily on education rather than employment — but its school and college training programmes, which have now reached over 360,000 education professionals, create the conditions in which careers guidance for autistic students is more likely to be effective. Schools where AET-trained staff understand autistic communication and sensory needs are schools where autistic young people are more likely to feel safe engaging with careers guidance. For careers leaders, encouraging AET training among colleagues is a systemic action that benefits their own work.

**Ambitious about Autism** works at the intersection of education, employment, and advocacy for autistic children and young people. Its Careers in Schools programme specifically addresses the gap in autism-inclusive careers education, providing resources, CPD, and a growing national network of practitioners. The Careers in Schools programme represents the most direct collaboration point for careers leaders who want to deepen their expertise, access peer support, and contribute to the evidence base for what works.

**Local referral pathways** vary significantly by area. Careers leaders should maintain a local directory that includes: local NAS branches and employment services, supported internship providers, transitions coordinators, and any local authority SEND teams with employment-focused remits. Building this directory proactively — before it is urgently needed — is a mark of a well-organised and strategic careers leader.`,
        quizQuestions: [
          {
            id: 'cq-4-2-1',
            question: 'Which organisation specifically offers employment support services for autistic adults through its Prospects service?',
            options: [
              'Autism Education Trust (AET)',
              'Ambitious about Autism',
              'National Autistic Society (NAS)',
              'Careers & Enterprise Company (CEC)',
            ],
            correctAnswer: 'National Autistic Society (NAS)',
            explanation: 'NAS Prospects is a specialist employment service for autistic adults, offering job coaching, employer engagement, and employment support — making it a key referral for young people approaching the end of their education.',
          },
          {
            id: 'cq-4-2-2',
            question: 'Why is AET school training relevant to the work of a careers leader, even though AET focuses on education rather than employment?',
            options: [
              'AET provides direct careers guidance resources for use in one-to-one sessions',
              'AET-trained colleagues create a whole-school environment where autistic young people are more likely to engage effectively with careers guidance',
              'AET training is required before a careers leader can work with SEND pupils',
              'AET provides the Gatsby Benchmark assessment framework used by Ofsted',
            ],
            correctAnswer: 'AET-trained colleagues create a whole-school environment where autistic young people are more likely to engage effectively with careers guidance',
            explanation: 'When school staff broadly understand autistic communication and sensory needs, the whole environment becomes more accessible — which directly benefits the careers leader\'s ability to engage autistic young people effectively.',
          },
        ],
      },
      {
        id: 'careers-4-3',
        moduleId: 'careers-module-4',
        title: "Building Your School's Autism-Inclusive Careers Culture",
        type: 'TEXT',
        order: 3,
        content: `Sustainable improvement in careers outcomes for autistic young people does not come from individual heroics — it comes from embedding autism-inclusive practice into the culture, systems, and expectations of the careers programme. This final lesson looks at how to move from good individual practice to a whole-school approach.

**Start with audit and evidence.** Before making the case for change, a careers leader needs to know where they currently stand. This means mapping current provision against the Gatsby Benchmarks with a specific SEND lens: which benchmarks are being met for autistic young people, which are not, and what would need to change? It also means gathering data — not just on Gatsby scores, but on destinations: where are autistic young people going at 16, at 18, and at 21? Are they in employment, education, or training? Are they NEET? These data points, collected longitudinally, make the case for investment and change more compellingly than any anecdote.

**Secure senior leadership buy-in.** The most effective autism-inclusive careers programmes have explicit support from the headteacher or principal and are embedded in the school improvement plan. The language of Ofsted's Personal Development judgement — which explicitly includes careers education and SEND provision — provides a powerful lever for careers leaders who want to make the case to senior leaders. Framing investment in autism-inclusive careers as "this will strengthen our Personal Development evidence" translates a values-based argument into an inspection-risk management argument.

**Build staff capacity.** A careers leader cannot be everywhere at once. Embedding autism awareness into the induction of form tutors, heads of year, and subject teachers — and building a brief briefing for employer partners before every workplace visit — creates a network of informed adults around every autistic young person. This is precisely the model that the Autism Education Trust has used to reach 360,000+ school staff: train some people deeply, train many people broadly, and create a shared language and set of expectations that makes the whole institution more effective.

**Celebrate and share success.** When autistic young people secure apprenticeships, college places, supported internships, or employment — document it, share it (with the young person's permission), and use it to build the narrative that autism-inclusive careers education works. This evidence inspires other young people, builds employer confidence, and demonstrates impact to senior leaders and governors. The careers leader who builds a culture of celebrating autistic young people's achievements is also building the institutional memory and motivation to sustain good practice over time.`,
        quizQuestions: [
          {
            id: 'cq-4-3-1',
            question: 'What is the most effective way for a careers leader to make the case for investment in autism-inclusive careers education to a headteacher?',
            options: [
              'Focus exclusively on the moral argument for equity',
              'Link the investment to strengthening Ofsted Personal Development evidence and managing inspection risk',
              'Wait until an Ofsted inspection identifies it as a weakness',
              'Cite statistics from national research without local data',
            ],
            correctAnswer: 'Link the investment to strengthening Ofsted Personal Development evidence and managing inspection risk',
            explanation: 'Senior leaders respond to both values and risk arguments. Linking autism-inclusive careers to the Personal Development judgement — a real inspection risk area — translates a values argument into a strategic one.',
          },
          {
            id: 'cq-4-3-2',
            question: 'Which approach best describes building autism-inclusive careers practice at whole-school level?',
            options: [
              'The careers leader personally delivering all guidance for autistic students',
              'Training a small number of staff to expert level and leaving all autism-related work to them',
              'Embedding autism awareness broadly across staff, with deep expertise among a smaller core team',
              'Delegating all autism-related provision to the SENCO',
            ],
            correctAnswer: 'Embedding autism awareness broadly across staff, with deep expertise among a smaller core team',
            explanation: 'The AET model — broad awareness for many, deep expertise for some — creates a whole-school environment rather than depending on individuals. This is more sustainable and reaches more young people.',
          },
        ],
      },
    ],
  },
]
