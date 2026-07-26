# AI Prompt Reference

A single place to find and edit every AI prompt used in the app.

## Table of contents

- [How to edit a prompt](#how-to-edit-a-prompt)
- [Quick reference table](#quick-reference-table)
  - [Personal Statement](#personal-statement)
  - [Rephrase bullet point](#rephrase-bullet-point)
  - [Suggest skills](#suggest-skills)
  - [Improve description](#improve-description)
  - [Expand interests](#expand-interests)
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

Admin-triggered AI calls are rate-limited per user through the shared `createRateLimiter` factory in `lib/rate-limit.ts` — a short-window burst limit plus a 24-hour daily ceiling, so a stuck client cannot drain the AI Gateway budget. Current daily caps: training content generation 20/day, library document metadata 50/day, library collection metadata 30/day.

Other AI endpoints (surveys, library, training content, observations) are gated by role permissions only. If you add a new public-facing AI endpoint, copy the rate-limit block from `cv-builder/[cvId]/ai/route.ts`.

---

## Quick reference table

| Feature | Function | File |
|---|---|---|
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

## Retired prompts

Three prompt families have been removed from the platform and are no longer in the registry:

- **CV Builder** (`cv.personalStatement`, `cv.rephraseBullet`, `cv.suggestSkills`, `cv.improveDescription`, `cv.expandInterests`) and **Careers Advisor** (`careers.report`) — removed July 2026 with their features. Their full text, requirements and response formats are preserved in [`docs/archive/retired-feature-specs.md`](archive/retired-feature-specs.md).
- **Child observations** (`observations.summary`, `observations.patterns`, `observations.actions`, `observations.report`) — removed April 2026 with the child-observations feature. Also preserved in the archive document.

Do not reintroduce these keys without reading the archive first — the anti-diagnosis wording in particular was agreed with the charity.

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
