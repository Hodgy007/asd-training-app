# AI Prompt Reference

A single place to find and edit every AI prompt used in the app.

## Table of contents

- [How to edit a prompt](#how-to-edit-a-prompt)
- [Quick reference table](#quick-reference-table)
- [CV Builder](#cv-builder)
  - [Personal Statement](#personal-statement)
  - [Rephrase bullet point](#rephrase-bullet-point)
  - [Suggest skills](#suggest-skills)
  - [Improve description](#improve-description)
  - [Expand interests](#expand-interests)
- [AI Careers Advisor](#ai-careers-advisor)
- [Child observations (ASD)](#child-observations-asd)
  - [Observation summary](#observation-summary)
  - [Pattern detection](#pattern-detection)
  - [Action guidance](#action-guidance)
  - [Full insight report](#full-insight-report)
- [Surveys](#surveys)
  - [Generate survey from topic](#generate-survey-from-topic)
  - [Generate survey from training files](#generate-survey-from-training-files)
  - [Survey results summary](#survey-results-summary)
  - [Comparative analysis](#comparative-analysis)
  - [Survey recommendations](#survey-recommendations)
- [Training content generator](#training-content-generator)
  - [Outline (structure mode / generate mode)](#outline-structure-mode--generate-mode)
  - [Lesson content](#lesson-content)
- [Quiz generation](#quiz-generation)
- [Library metadata and thumbnails](#library-metadata-and-thumbnails)
- [Global conventions](#global-conventions)

---

## How to edit a prompt

Every prompt in this document is a plain string in a TypeScript file. To change what the AI produces, edit that string and redeploy. No schema migrations, no environment variables, no rebuild of the AI model. Steps:

1. **Find the prompt** using the file path given in each section below.
2. **Open the file** in your editor.
3. **Edit the template literal** (the text between backticks `` ` ``). You can change wording, add rules, remove rules, change the number of bullet points asked for, etc.
4. **Save** and commit. On push, Vercel redeploys and the next AI call uses the new prompt.
5. **Test locally first** with `npm run dev` — the change takes effect as soon as the file is saved.

### What to preserve when editing

- **`${...}` placeholders** are TypeScript string interpolation. Don't delete them or the real user data won't reach the model. Example: `${context.name}` gets replaced with the person's name at request time.
- **The JSON shape clause** ("Return ONLY valid JSON in this format: {…}") — if you change it, also change the parser code that reads the result. These are flagged in each section.
- **Safety clauses** — any line starting with "Never mention disabilities, diagnoses, or health conditions" is a hard requirement across the app. Keep it in every prompt that generates user-facing copy.
- **Model ID** — `'google/gemini-2.5-flash'` in a `const MODEL` at the top of each file. Leave it unless you are consciously changing model tier.

### Where to change the model

Each file has `const MODEL = 'google/gemini-2.5-flash'` at the top. To switch every prompt in that file to a different model, change the constant. To change the whole app's default, grep for `const MODEL = ` and update all occurrences.

### Rate limiting

CV Builder and Careers Advisor AI calls are rate-limited to **10 requests per 5 minutes per user** via an in-memory limiter in:

- `app/api/cv-builder/[cvId]/ai/route.ts`
- `app/api/careers-advisor/[sessionId]/generate/route.ts`

Other AI endpoints (surveys, library, training content, observations) are gated by role permissions only. If you add a new public-facing AI endpoint, copy the rate-limit block from `cv-builder/[cvId]/ai/route.ts`.

---

## Quick reference table

| Feature | Function | File |
|---|---|---|
| CV → Personal Statement | `generatePersonalStatement` | `lib/cv-ai.ts` |
| CV → Rephrase bullet | `rephraseBulletPoint` | `lib/cv-ai.ts` |
| CV → Suggest skills | `suggestSkills` | `lib/cv-ai.ts` |
| CV → Improve description | `improveDescription` | `lib/cv-ai.ts` |
| CV → Expand interests | `expandInterests` | `lib/cv-ai.ts` |
| Careers Advisor report | `generateCareersReport` | `lib/careers-advisor-ai.ts` |
| Observation summary | `generateObservationSummary` | `lib/gemini.ts` |
| Pattern detection | `detectPatterns` | `lib/gemini.ts` |
| Action guidance | `generateActionGuidance` | `lib/gemini.ts` |
| Full insight report | `generateInsightReport` | `lib/gemini.ts` |
| Survey from topic | `generateSurveyFromTopic` | `lib/survey-ai.ts` |
| Survey from training files | `generateSurveyFromFiles` | `lib/survey-ai.ts` |
| Survey summary | `generateSurveySummary` | `lib/survey-ai.ts` |
| Survey comparative | `generateSurveyComparative` | `lib/survey-ai.ts` |
| Survey recommendations | `generateSurveyRecommendations` | `lib/survey-ai.ts` |
| Training outline | `generateOutline` | `lib/content-generator.ts` |
| Lesson content | `generateLessonContent` | `lib/content-generator.ts` |
| Quiz generation | inline prompt | `app/api/super-admin/training/generate-quiz/route.ts` |
| Library metadata | inline prompt | `app/api/super-admin/library/generate/route.ts` |
| Library thumbnail | inline prompt | `app/api/super-admin/library/generate/route.ts` |

---

## CV Builder

All CV Builder prompts live in `lib/cv-ai.ts` and are wired to a single endpoint `POST /api/cv-builder/:cvId/ai` which routes by `type` (`statement` | `rephrase` | `skills` | `improve` | `interests`). The client step components pick the right `type` based on which wizard step the user is on.

### Personal Statement

**File:** `lib/cv-ai.ts` → `generatePersonalStatement`
**Triggered from:** Step 2 (Personal Statement) — "Help me write a personal statement" button.
**Inputs:** `name`, optional `targetRole`, work-experience summary, education summary (all pulled from the CV record server-side).
**Returns:** A single string, 3–4 sentences, first person.

Prompt:

```
Write a personal statement for a UK CV for a person named ${context.name}.
${roleContext}

Their experience: ${context.experience || 'Not yet provided'}
Their education: ${context.education || 'Not yet provided'}

Requirements:
- Write 3-4 sentences in the first person.
- Focus on strengths, skills, and what the person can offer.
- Use simple, clear language that is easy to understand.
- Use UK English spelling throughout (e.g. organised, recognised, specialised).
- Never mention disabilities, diagnoses, or health conditions.
- Do not include any headings, labels, or formatting — return ONLY the personal statement text.
```

### Rephrase bullet point

**File:** `lib/cv-ai.ts` → `rephraseBulletPoint`
**Triggered from:** inside the Work Experience step when the user clicks the AI icon next to an existing bullet point.
**Inputs:** `originalText`, `jobTitle`, `employer`.
**Returns:** A single rephrased bullet as a one-line string.

Prompt:

```
Rephrase this CV bullet point for a ${jobTitle} role at ${employer}:

"${originalText}"

Requirements:
- Start with a strong action verb (e.g. Managed, Delivered, Organised, Supported).
- Keep it to one concise sentence.
- Be specific and results-oriented where possible.
- Use simple, clear language that is easy to understand.
- Focus on strengths and achievements.
- Use UK English spelling throughout.
- Never mention disabilities, diagnoses, or health conditions.
- Return ONLY the rephrased bullet point, nothing else.
```

### Suggest skills

**File:** `lib/cv-ai.ts` → `suggestSkills`
**Triggered from:** Step 5 (Skills) — "Suggest skills for me" button.
**Inputs:** experience summary, education summary (pulled from the CV).
**Returns:** A JSON array of 8–12 objects shaped as `{ name: string, category: string }`. **The parser reads this shape — if you change the schema in the prompt, also change the filter in `suggestSkills` that validates each item.** Categories are constrained to `Technical | Communication | Teamwork | Personal | Organisation`.

Prompt:

```
Suggest 8-12 skills for a UK CV based on the following background.

Experience: ${context.experience || 'Not yet provided'}
Education: ${context.education || 'Not yet provided'}

Requirements:
- Each skill should belong to one of these categories: Technical, Communication, Teamwork, Personal, Organisation.
- Use simple, clear language that is easy to understand.
- Focus on strengths and transferable skills.
- Never mention disabilities, diagnoses, or health conditions.
- Return ONLY a valid JSON array with no additional text, markdown, or formatting.
- Format: [{"name":"Skill Name","category":"Category"}]
- Example: [{"name":"Microsoft Office","category":"Technical"},{"name":"Active Listening","category":"Communication"}]
```

### Improve description

**File:** `lib/cv-ai.ts` → `improveDescription`
**Triggered from:** Work Experience step when the user has written a rough description of their duties and clicks "Improve with AI".
**Inputs:** `description`, `jobTitle`, `employer`.
**Returns:** A block of 3–5 bullet points separated by newlines, each starting with `• ` and a strong action verb.

Prompt:

```
Convert this rough description of duties into 3-5 professional bullet points for a UK CV.
This is for a ${jobTitle} role at ${employer}.

Description: "${description}"

Requirements:
- Each bullet point must start with a strong action verb (e.g. Managed, Delivered, Organised, Supported, Coordinated).
- Be specific and results-oriented where possible.
- Use simple, clear language that is easy to understand.
- Focus on strengths and achievements.
- Use UK English spelling throughout.
- Never mention disabilities, diagnoses, or health conditions.
- Return each bullet point on its own line, starting with "• ".
- Return ONLY the bullet points, no headings or extra text.
```

### Expand interests

**File:** `lib/cv-ai.ts` → `expandInterests`
**Triggered from:** Step 6 (Interests & Hobbies) — "Help me write this" button.
**Inputs:** `rawText` (what the user has typed so far).
**Returns:** A single first-person paragraph, 1–3 sentences.

**Design note:** This prompt was added after the team noticed that routing interests through `improveDescription` turned simple hobbies (e.g. "played golf") into action-verb spin about transferable qualities (discipline, strategy). This prompt **preserves the actual activities** the user named and explicitly forbids inventing transferable-skill language.

Prompt:

```
Rewrite this short list of interests and hobbies into a brief, natural-sounding paragraph for the "Interests and Hobbies" section of a UK CV.

The person wrote:
"${input}"

Requirements:
- Write in the first person, 1-3 short sentences.
- Describe the actual activities they listed. Keep every activity they named (e.g. if they say "golf", the result must clearly be about playing golf — not about abstract qualities like discipline or strategy).
- Do NOT turn the activities into action-verb bullet points.
- Do NOT invent transferable-skill spin (no "which demonstrates teamwork", "improves concentration", "builds resilience", etc.).
- You may add a light, plain detail where natural (e.g. "I play golf at weekends" or "I enjoy watching football") but do not fabricate achievements, clubs, or competitions.
- If the input is vague, keep the output vague rather than inventing specifics.
- Use simple, clear language.
- Use UK English spelling throughout.
- Never mention disabilities, diagnoses, or health conditions.
- Return ONLY the paragraph text. No headings, no labels, no bullet points.
```

---

## AI Careers Advisor

**File:** `lib/careers-advisor-ai.ts` → `generateCareersReport`
**Endpoint:** `POST /api/careers-advisor/[sessionId]/generate` (rate-limited, 10 per 5 min).
**Triggered from:** the "Generate your report" step at the end of the Careers Advisor wizard.
**Inputs:** a structured `AdvisorAnswers` object (interests, strengths, environment, concerns, experience, stage, communication, sensory, values, other).
**Returns:** A JSON object matching `AdvisorReport` — validated by the function; throws if malformed.

**Key contract:** The response JSON shape drives the PDF rendering and the advisor student-view page. If you change the keys, also update `types/index.ts` (`AdvisorReport`) and `lib/careers-advisor-pdf.tsx`.

Prompt:

```
You are a careers advisor helping a young person explore career options. You are positive, practical, and strength-focused. You use UK English and references UK-specific resources.

Here are the young person's questionnaire answers:

${formattedAnswers}

Based on these answers, generate a personalised careers report. You MUST respond with valid JSON matching this exact structure:

{
  "strengths": "A short paragraph (3-5 sentences) summarising the young person's key strengths based on their answers. Written in second person ('You have...'). Be specific to their answers, not generic.",
  "careers": [
    {
      "name": "Career Name",
      "explanation": "2-3 sentences explaining why this career suits them, grounded in their specific answers."
    }
  ],
  "nextSteps": [
    "A concrete, actionable next step"
  ],
  "workplaceSupport": "A paragraph about workplace support suggestions based on their environment, sensory, and communication preferences. Reference UK-specific support like Access to Work, reasonable adjustments, flexible working arrangements."
}

Requirements:
- Suggest 3 to 5 career areas in the "careers" array.
- Include 3 to 5 items in the "nextSteps" array.
- Each career suggestion must be realistic and achievable, not aspirational fantasy.
- Ground every suggestion in the young person's specific answers — do not give generic advice.
- Next steps should be concrete actions (e.g. "Search for apprenticeships on gov.uk", "Ask your careers professional about work experience in X").
- Reference UK-specific resources: gov.uk, apprenticeships, Access to Work scheme, National Careers Service.
- NEVER mention autism, disability, diagnosis, or any health condition.
- Use strength-focused, positive language throughout.
- Use UK English spelling (e.g. organised, recognised, specialised).
- Reference workplace adjustments as normal good practice, not as accommodations for a condition.
- Return ONLY the JSON object. No markdown, no code fences, no explanation.
```

---

## Child observations (ASD)

All four prompts live in `lib/gemini.ts` and are called by the Insights feature on a child's profile page. They share a strict safety frame: **never diagnose, never suggest autism**. The common `DISCLAIMER` string is appended to user-facing output to signal this is a discussion aid, not a diagnosis.

### Observation summary

**File:** `lib/gemini.ts` → `generateObservationSummary`
**Triggered from:** child profile → Insights card → "Generate summary".
**Inputs:** observations array, child name, child DOB.
**Returns:** A short practitioner-friendly paragraph ending with the disclaimer string.

Prompt pattern (simplified):

```
You are an assistant supporting carers and professionals who work with children.
Your role is to summarise observational data to help identify patterns.
You NEVER provide a diagnosis. You NEVER suggest a child has autism.
...
Please provide a brief summary (2-3 sentences) of the observed patterns...
End with: "${DISCLAIMER}"
```

### Pattern detection

**File:** `lib/gemini.ts` → `detectPatterns`
**Returns:** 2–4 bulleted pattern observations, no diagnosis.

### Action guidance

**File:** `lib/gemini.ts` → `generateActionGuidance`
**Inputs:** a patterns string (output from `detectPatterns`).
**Returns:** 3–4 bulleted next steps, including who to speak to (GP / health visitor / SENCO / speech therapist), ending with the disclaimer.

### Full insight report

**File:** `lib/gemini.ts` → `generateInsightReport`
**Endpoint:** `POST /api/children/[childId]/insights`.
**Returns:** An object shaped `{ summary, patterns, recommendations }` — parsed from three labelled sections in the AI output (`SUMMARY:`, `PATTERNS:`, `RECOMMENDATIONS:`). **If you change the section headers in the prompt, also update the regexes in the function that extract them.**

Prompt pattern (simplified):

```
Please provide your response in exactly this format with these three sections:

SUMMARY:
[2-3 sentences...]

PATTERNS:
[Bullet points...]

RECOMMENDATIONS:
[3-4 practical next steps...]

Always end the RECOMMENDATIONS section with: "${DISCLAIMER}"
```

Full versions of all four prompts are in `lib/gemini.ts`.

---

## Surveys

Five prompts in `lib/survey-ai.ts`, split between **authoring** (building a new survey) and **analysis** (understanding results).

### Generate survey from topic

**File:** `lib/survey-ai.ts` → `generateSurveyFromTopic`
**Triggered from:** super admin → Surveys → "AI: Generate from topic".
**Inputs:** `topic` string, optional `audience` string.
**Returns:** `GeneratedSurvey` JSON — `{ title, description, questions: [...] }`. Each question has a `type` from a fixed enum: `MULTIPLE_CHOICE | YES_NO | FREE_TEXT | RATING_SCALE | MULTI_SELECT`.

**Key rules in the prompt:** 8–12 questions; must include at least one `FREE_TEXT` and one `RATING_SCALE`; `YES_NO` and `RATING_SCALE` must NOT have options; `RATING_SCALE` is always 1–5.

### Generate survey from training files

**File:** `lib/survey-ai.ts` → `generateSurveyFromFiles`
**Triggered from:** super admin → Surveys → "AI: Generate from training material".
**Inputs:** an array of parsed training files.
**Returns:** same `GeneratedSurvey` shape as above, but biased toward comprehension questions (testing understanding) followed by feedback questions.

### Survey results summary

**File:** `lib/survey-ai.ts` → `generateSurveySummary`
**Triggered from:** super admin → Surveys → `[surveyId]/results` → "Generate summary".
**Returns:** HTML string (3–5 paragraphs with `<p>`, `<strong>`, `<ul>`, `<li>`).

**Note:** The function builds a compact text breakdown of the results (averages, yes/no splits, multi-choice counts, samples of free-text) before calling the AI — so the model receives aggregates, not raw response blobs. A caveat is injected when total responses are below 5.

### Comparative analysis

**File:** `lib/survey-ai.ts` → `generateSurveyComparative`
**Returns:** HTML string with role-by-role and org-by-org breakdowns. Prompt is told to use `<table>` elements where useful.

### Survey recommendations

**File:** `lib/survey-ai.ts` → `generateSurveyRecommendations`
**Returns:** HTML string with a prioritised list of 5–7 recommendations, each labelled High / Medium / Low priority.

---

## Training content generator

**File:** `lib/content-generator.ts`
**Triggered from:** super admin → Training → "Generate from files" flow. Two modes are exposed:

- **Structure mode** — organises the source material without inventing anything. Every lesson is mapped to specific source sections via numeric indices.
- **Generate mode** — designs pedagogically sound structure from the material. May re-order and re-group, but still must map every lesson to source.

### Outline (structure mode / generate mode)

**Function:** `generateOutline(files, mode, programName)`
**Returns:** `GeneratedOutline` JSON with modules → lessons → sourceRefs `{ fileIndex, sectionIndices }`.

Both modes share the same response schema; the rules differ. Find them at `lib/content-generator.ts:122` (structure) and `lib/content-generator.ts:156` (generate).

### Lesson content

**Function:** `generateLessonContent(files, lessonTitle, sourceRefs, ...)` at `lib/content-generator.ts:206`.
**Returns:** HTML for the lesson body. Three sub-modes:

- Structure mode — preserves original wording, only adds HTML formatting (`<p>`, `<h2>`, `<ul>`).
- Generate + **Autism lens** — clear, literal language with bullet points, short sentences.
- Generate + **Practitioner lens** — professional, practical strategies, reflection prompts.

Edit the per-mode prompt strings in that function to change tone, length, or formatting.

---

## Quiz generation

**File:** `app/api/super-admin/training/generate-quiz/route.ts`
**Triggered from:** super admin lesson editor → "Generate quiz with AI".
**Inputs:** `lessonContent` (HTML), `questionCount` (1–10, default 5).
**Returns:** `{ questions: Array<{ question, options, correctAnswer, explanation }> }`.

Prompt:

```
You are a training quiz generator. Based on the following lesson content, generate ${count} multiple-choice quiz questions.

Each question must:
- Test understanding of a key concept from the lesson
- Have exactly 4 options labelled A, B, C, D
- Have exactly one correct answer
- Include a brief explanation of why the correct answer is right

Return ONLY a valid JSON array with this structure:
[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A) ...", "explanation": "..."}]

Lesson content:
${plainText}
```

**Note:** The prompt is inline in the route handler (not in a shared lib) because the lesson editor is the only consumer. If a second caller ever needs quiz generation, extract the prompt into `lib/quiz-ai.ts`.

---

## Library metadata and thumbnails

**File:** `app/api/super-admin/library/generate/route.ts`
**Triggered from:** Document Library upload modal → "Auto-generate metadata".

Two prompts in the same file:

### Text (title + description)

**Inputs:** `fileName`, optional `collectionTitle`.
**Returns:** `{ title, description }` JSON. Falls back to a munged filename if the AI fails.

```
You are helping create metadata for a document in a training library${collectionTitle ? ` under the collection "${collectionTitle}"` : ''}. The document's filename is: "${fileName}"

Generate a clear, friendly title and a short description (2-3 sentences) suitable for young people and training practitioners. The title should be human-readable (not the raw filename). The description should summarise what the document likely contains based on its name.

Return ONLY valid JSON in this exact format, no markdown:
{"title": "...", "description": "..."}
```

### Image (thumbnail)

**Inputs:** the generated title.
**Returns:** a PNG/JPG uploaded to Vercel Blob, URL returned as `thumbnailUrl`.

```
Create a simple, friendly, colourful illustration for a training document titled "${title}". The image should be a clean, modern flat illustration style with bright welcoming colours. No text in the image. Professional but approachable.
```

The route tries Gemini multimodal first (`google/gemini-3.1-flash-image-preview`) and falls back to Imagen 4 (`google/imagen-4.0-generate-001`) if that fails.

---

## Global conventions

Kept identical across every user-facing prompt so the app speaks with one voice.

| Rule | Applied everywhere? |
|---|---|
| Use UK English spelling | Yes (CV, Careers, Surveys, Library). Observations prompts don't enforce it explicitly — they're practitioner-facing and UK English is the default locale. |
| Never mention disabilities, diagnoses, or health conditions | Yes (CV, Careers). Observation prompts have the stronger rule: never diagnose and never suggest autism. |
| Use simple, clear language | Yes. |
| Never return markdown fences or extra explanation | Yes for JSON-returning prompts. |
| Return only the requested output (no headings, labels) | Yes for single-field prompts. |

If you add a new prompt, copy these rules verbatim into the "Requirements" block of the new prompt string.

---

## When changes go live

- Local dev: changes take effect on next save (hot reload).
- Preview / production: next deploy to Vercel after a commit + push.
- Prompts are **not cached** on the server — every request re-reads the TypeScript string. No cache-busting step needed.
