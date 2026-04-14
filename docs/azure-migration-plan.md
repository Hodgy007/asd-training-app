# Full Azure Migration Plan — ASD Training App

## Context

This document covers a complete migration of the ASD Training App (`asd-training-app-v2`) from Vercel to Azure. The app is a Next.js 14 App Router application currently hosted on Vercel with:

- **Database:** Neon PostgreSQL (43 models, 10 enums)
- **File Storage:** Vercel Blob (`@vercel/blob`) — 6 API routes
- **AI:** Google Gemini via Vercel AI Gateway (`ai` SDK) — 7 files, 2 API routes
- **Image Generation:** Gemini 3.1 Flash Image Preview + Imagen 4 fallback
- **Email:** Resend
- **Auth:** NextAuth v4 (Credentials + Google OAuth + Azure AD SSO)

The migration replaces **all** Vercel and Google AI dependencies with Azure-native services:
- Vercel hosting → **Azure App Service**
- Neon PostgreSQL → **Azure Database for PostgreSQL Flexible Server**
- Vercel Blob → **Azure Blob Storage**
- Gemini AI → **Azure OpenAI** (GPT-4o)
- Imagen/Gemini Image → **Azure OpenAI DALL-E 3**
- Vercel CI/CD → **GitHub Actions**

---

## Dependency Inventory

| Area | Current | Azure Replacement | Code Change |
|---|---|---|---|
| Hosting | Vercel | Azure App Service (Linux, Node 22) | Config only |
| Database | Neon PostgreSQL | Azure Database for PostgreSQL Flexible Server | Connection strings only |
| File Storage | Vercel Blob (`@vercel/blob`) | Azure Blob Storage (`@azure/storage-blob`) | 6 API routes + new helper |
| AI (Text) | Gemini 2.5 Flash via Vercel AI Gateway | Azure OpenAI GPT-4o (`@ai-sdk/azure`) | 7 lib files + 2 API routes |
| AI (Image) | Gemini 3.1 Flash Image Preview + Imagen 4 | Azure OpenAI DALL-E 3 | 1 API route |
| CI/CD | Vercel Git integration | GitHub Actions | New workflow file |
| Auth | NextAuth v4 (portable) | No change — update `NEXTAUTH_URL` and redirect URIs | Config only |
| Email | Resend (portable) | No change | None |
| Secrets | Vercel env vars | Azure App Service settings (or Key Vault) | Config only |

---

## Phase 1 — Azure Infrastructure Setup

### 1.1 Prerequisites

```bash
# Install Azure CLI (macOS)
brew install azure-cli

# Login
az login

# Set subscription (if you have multiple)
az account set --subscription "Your Subscription Name"
```

### 1.2 Create Resource Group

All resources go in a single resource group in UK South (closest to your users):

```bash
az group create \
  --name asd-training-rg \
  --location uksouth
```

### 1.3 Create Azure App Service

```bash
# App Service Plan (Linux, P1v3 tier — 2 vCPU, 8GB RAM)
az appservice plan create \
  --name asd-training-plan \
  --resource-group asd-training-rg \
  --sku P1v3 \
  --is-linux

# Web App (Node.js 22 LTS)
az webapp create \
  --name asd-training-app \
  --resource-group asd-training-rg \
  --plan asd-training-plan \
  --runtime "NODE:22-lts"

# Configure startup command for Next.js standalone
az webapp config set \
  --name asd-training-app \
  --resource-group asd-training-rg \
  --startup-file "node server.js"

# Enable HTTPS only
az webapp update \
  --name asd-training-app \
  --resource-group asd-training-rg \
  --https-only true
```

### 1.4 Create Azure Storage Account (replaces Vercel Blob)

```bash
# Storage account (globally unique name, lowercase, no hyphens)
az storage account create \
  --name asdtrainingstorage \
  --resource-group asd-training-rg \
  --location uksouth \
  --sku Standard_LRS \
  --kind StorageV2

# Create blob container for file uploads
az storage container create \
  --name uploads \
  --account-name asdtrainingstorage \
  --public-access blob

# Get connection string (save this — needed for env vars)
az storage account show-connection-string \
  --name asdtrainingstorage \
  --resource-group asd-training-rg \
  --query connectionString -o tsv
```

### 1.5 Create Azure Database for PostgreSQL

```bash
# PostgreSQL Flexible Server (UK South, burstable tier for cost)
az postgres flexible-server create \
  --name asd-training-db \
  --resource-group asd-training-rg \
  --location uksouth \
  --admin-user asdadmin \
  --admin-password '<STRONG_PASSWORD_HERE>' \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --yes

# Create the application database
az postgres flexible-server db create \
  --resource-group asd-training-rg \
  --server-name asd-training-db \
  --database-name asd_training

# Allow Azure services to connect (required for App Service)
az postgres flexible-server firewall-rule create \
  --resource-group asd-training-rg \
  --name asd-training-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# (Optional) Allow your local IP for migration/debugging
az postgres flexible-server firewall-rule create \
  --resource-group asd-training-rg \
  --name asd-training-db \
  --rule-name AllowLocalDev \
  --start-ip-address <YOUR_IP> \
  --end-ip-address <YOUR_IP>

# Enable SSL enforcement
az postgres flexible-server update \
  --resource-group asd-training-rg \
  --name asd-training-db \
  --ssl-enforcement Enabled
```

**Connection strings will be:**
```
DATABASE_URL=postgresql://asdadmin:<PASSWORD>@asd-training-db.postgres.database.azure.com:5432/asd_training?sslmode=require
DIRECT_URL=postgresql://asdadmin:<PASSWORD>@asd-training-db.postgres.database.azure.com:5432/asd_training?sslmode=require
```

> **Note:** Unlike Neon, Azure PostgreSQL does not use a connection pooler (no separate pooler port). Both `DATABASE_URL` and `DIRECT_URL` use the same connection string. If you need connection pooling at scale, add **PgBouncer** — Azure Flexible Server has built-in PgBouncer support:

```bash
az postgres flexible-server parameter set \
  --resource-group asd-training-rg \
  --server-name asd-training-db \
  --name pgbouncer.enabled \
  --value true
```

With PgBouncer enabled, use port `6432` for pooled connections:
```
DATABASE_URL=postgresql://asdadmin:<PASSWORD>@asd-training-db.postgres.database.azure.com:6432/asd_training?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://asdadmin:<PASSWORD>@asd-training-db.postgres.database.azure.com:5432/asd_training?sslmode=require
```

### 1.6 Create Azure OpenAI Resource

```bash
# Azure OpenAI resource (UK South if available, otherwise Sweden Central)
az cognitiveservices account create \
  --name asd-training-openai \
  --resource-group asd-training-rg \
  --location uksouth \
  --kind OpenAI \
  --sku S0 \
  --yes

# Deploy GPT-4o model (replaces Gemini 2.5 Flash for all text generation)
az cognitiveservices account deployment create \
  --name asd-training-openai \
  --resource-group asd-training-rg \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-capacity 30 \
  --sku-name Standard

# Deploy DALL-E 3 model (replaces Gemini Image/Imagen for thumbnails)
az cognitiveservices account deployment create \
  --name asd-training-openai \
  --resource-group asd-training-rg \
  --deployment-name dall-e-3 \
  --model-name dall-e-3 \
  --model-version "3.0" \
  --model-format OpenAI \
  --sku-capacity 1 \
  --sku-name Standard

# Get the API key and endpoint
az cognitiveservices account keys list \
  --name asd-training-openai \
  --resource-group asd-training-rg

az cognitiveservices account show \
  --name asd-training-openai \
  --resource-group asd-training-rg \
  --query properties.endpoint -o tsv
```

> **Note:** If GPT-4o is not available in `uksouth`, use `swedencentral` or `eastus` instead. The model runs in the Azure region, but latency difference is minimal for text generation. Check availability: `az cognitiveservices model list --location uksouth -o table`

---

## Phase 2 — Database Migration (Neon → Azure PostgreSQL)

### 2.1 Export from Neon

```bash
# Export the production database from Neon
# Use the DIRECT_URL (port 5432) for pg_dump, not the pooler URL
pg_dump \
  "postgresql://neondb_owner:<NEON_PASSWORD>@ep-blue-thunder-a88kb0cy.eastus2.azure.neon.tech:5432/neondb?sslmode=require" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file=neon_backup.dump
```

### 2.2 Import into Azure PostgreSQL

```bash
# Restore into Azure PostgreSQL
pg_restore \
  --host=asd-training-db.postgres.database.azure.com \
  --port=5432 \
  --username=asdadmin \
  --dbname=asd_training \
  --no-owner \
  --no-privileges \
  --verbose \
  neon_backup.dump
```

### 2.3 Verify the Migration

```bash
# Connect to Azure PostgreSQL and verify
psql "postgresql://asdadmin:<PASSWORD>@asd-training-db.postgres.database.azure.com:5432/asd_training?sslmode=require"

# Check table count (should be 43 tables matching Prisma schema)
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

# Check row counts for key tables
SELECT 'User' as tbl, count(*) FROM "User"
UNION ALL SELECT 'Organisation', count(*) FROM "Organisation"
UNION ALL SELECT 'TrainingProgram', count(*) FROM "TrainingProgram"
UNION ALL SELECT 'Module', count(*) FROM "Module"
UNION ALL SELECT 'Lesson', count(*) FROM "Lesson"
UNION ALL SELECT 'CV', count(*) FROM "CV"
UNION ALL SELECT 'Survey', count(*) FROM "Survey"
UNION ALL SELECT 'LibraryCollection', count(*) FROM "LibraryCollection";
```

### 2.4 Run Prisma Against Azure PostgreSQL

```bash
# Update .env.local with Azure PostgreSQL connection strings
# Then validate Prisma can connect
npx prisma db pull    # Introspect — should match your schema exactly
npx prisma generate   # Regenerate client
```

### 2.5 Prisma Schema — No Changes Needed

The Prisma schema (`prisma/schema.prisma`) uses standard PostgreSQL. The `datasource` block is already parameterised:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

All 43 models, 10 enums, 20+ indexes, Json fields, string arrays, and self-referencing relations work identically on Azure PostgreSQL. **Zero schema changes required.**

---

## Phase 3 — Replace Vercel Blob with Azure Blob Storage

### 3.1 Install Azure Storage SDK

```bash
npm uninstall @vercel/blob
npm install @azure/storage-blob
```

### 3.2 Create Storage Helper — `lib/azure-storage.ts` (NEW)

```ts
import { BlobServiceClient } from '@azure/storage-blob'

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
if (!connectionString) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
const containerClient = blobServiceClient.getContainerClient('uploads')

/**
 * Upload a file to Azure Blob Storage.
 * Replaces: put(path, data, { access: 'public', ... }) from @vercel/blob
 */
export async function uploadBlob(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const blockBlobClient = containerClient.getBlockBlobClient(path)
  await blockBlobClient.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
  return blockBlobClient.url
}

/**
 * Delete a file from Azure Blob Storage.
 * Replaces: del(url) from @vercel/blob
 */
export async function deleteBlob(url: string): Promise<void> {
  const blobUrl = new URL(url)
  // Azure blob URLs: https://<account>.blob.core.windows.net/<container>/<path>
  const pathParts = blobUrl.pathname.split('/').slice(2) // skip /<container>/
  const blobName = pathParts.join('/')
  await containerClient.getBlockBlobClient(blobName).deleteIfExists()
}
```

### 3.3 Update the 6 Affected API Routes

Each route currently imports `{ put }` or `{ del }` from `@vercel/blob`. Replace with `uploadBlob` / `deleteBlob` from the new helper.

**Routes using `put()` (upload):**

| Route | Current | Replacement |
|---|---|---|
| `app/api/super-admin/training/upload/route.ts` | `put(filename, buffer, { access: 'public', addRandomSuffix: true, contentType })` | `uploadBlob(filename, buffer, contentType)` |
| `app/api/super-admin/library/upload/route.ts` | `put(path, buffer, { access: 'public', addRandomSuffix: true, contentType })` | `uploadBlob(path, buffer, contentType)` |
| `app/api/super-admin/library/generate/route.ts` | `put(path, imageBuffer, { access: 'public', addRandomSuffix: true, contentType })` | `uploadBlob(path, imageBuffer, contentType)` |
| `app/api/super-admin/training/lessons/[lessonId]/attachments/route.ts` | `put(path, buffer, { access: 'public', addRandomSuffix: true, contentType })` | `uploadBlob(path, buffer, contentType)` |

> **Note:** Vercel Blob's `addRandomSuffix: true` appends a random string to the filename to prevent collisions. With Azure, add this manually: `const uniquePath = \`${path}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}\``

**Routes using `del()` (delete):**

| Route | Current | Replacement |
|---|---|---|
| `app/api/super-admin/training/lessons/[lessonId]/attachments/[attachmentId]/route.ts` | `del(attachment.url)` | `deleteBlob(attachment.url)` |
| `app/api/super-admin/library/[id]/documents/[docId]/route.ts` | `del(document.fileUrl)` | `deleteBlob(document.fileUrl)` |

**Import change in each file:**
```ts
// BEFORE
import { put } from '@vercel/blob'
// or
import { del } from '@vercel/blob'

// AFTER
import { uploadBlob } from '@/lib/azure-storage'
// or
import { deleteBlob } from '@/lib/azure-storage'
```

### 3.4 Migrate Existing Files from Vercel Blob to Azure

```bash
# Install AzCopy (macOS)
brew install azcopy

# List existing Vercel Blob files (you'll need your Vercel Blob read token)
# Or export them from Vercel Dashboard > Storage > Blob

# Copy files to Azure Blob Storage
azcopy copy \
  'https://<vercel-blob-url>/*' \
  'https://asdtrainingstorage.blob.core.windows.net/uploads/<SAS_TOKEN>' \
  --recursive
```

### 3.5 Update Blob URLs in Database

After migrating files, update all stored URLs in the database from the Vercel Blob domain to the Azure domain:

```sql
-- Update document file URLs
UPDATE "LibraryDocument"
SET "fileUrl" = REPLACE("fileUrl",
  'https://<your-store>.public.blob.vercel-storage.com',
  'https://asdtrainingstorage.blob.core.windows.net/uploads')
WHERE "fileUrl" LIKE '%blob.vercel-storage.com%';

-- Update document thumbnail URLs
UPDATE "LibraryDocument"
SET "thumbnailUrl" = REPLACE("thumbnailUrl",
  'https://<your-store>.public.blob.vercel-storage.com',
  'https://asdtrainingstorage.blob.core.windows.net/uploads')
WHERE "thumbnailUrl" LIKE '%blob.vercel-storage.com%';

-- Update collection thumbnail URLs
UPDATE "LibraryCollection"
SET "thumbnailUrl" = REPLACE("thumbnailUrl",
  'https://<your-store>.public.blob.vercel-storage.com',
  'https://asdtrainingstorage.blob.core.windows.net/uploads')
WHERE "thumbnailUrl" IS NOT NULL AND "thumbnailUrl" LIKE '%blob.vercel-storage.com%';

-- Update lesson attachment URLs
UPDATE "LessonAttachment"
SET "url" = REPLACE("url",
  'https://<your-store>.public.blob.vercel-storage.com',
  'https://asdtrainingstorage.blob.core.windows.net/uploads')
WHERE "url" LIKE '%blob.vercel-storage.com%';
```

---

## Phase 4 — AI Migration (Vercel AI Gateway/Gemini → Azure OpenAI)

### 4.1 Install Azure OpenAI SDK

```bash
npm uninstall @ai-sdk/openai
npm install @ai-sdk/azure
```

> The `ai` SDK (v6) stays — only the provider package changes.

### 4.2 Create AI Provider Helper — `lib/ai-provider.ts` (NEW)

```ts
import { createAzure } from '@ai-sdk/azure'

export const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
})

/**
 * Text generation model — replaces 'google/gemini-2.5-flash'
 * Maps to your Azure OpenAI GPT-4o deployment
 */
export const TEXT_MODEL = azure('gpt-4o')

/**
 * Image generation model — replaces 'google/imagen-4.0-generate-001'
 * Maps to your Azure OpenAI DALL-E 3 deployment
 */
export const IMAGE_MODEL = azure.imageModel('dall-e-3')
```

### 4.3 Update All 7 AI Library Files

Every AI file currently has:
```ts
const MODEL = 'google/gemini-2.5-flash'
// ...
const { text } = await generateText({ model: MODEL, prompt, maxRetries: 3 })
```

Replace with:
```ts
import { TEXT_MODEL } from '@/lib/ai-provider'
// ...
const { text } = await generateText({ model: TEXT_MODEL, prompt, maxRetries: 3 })
```

**File-by-file changes:**

#### `lib/gemini.ts` — 4 AI functions

```ts
// REMOVE
const MODEL = 'google/gemini-2.5-flash'

// ADD
import { TEXT_MODEL } from '@/lib/ai-provider'

// In each function, change:
await generateText({ model: MODEL, ... })
// To:
await generateText({ model: TEXT_MODEL, ... })
```

Functions: `generateObservationSummary`, `detectPatterns`, `generateActionGuidance`, `generateInsightReport`

#### `lib/cv-ai.ts` — 4 AI functions

Same pattern. Functions: `generatePersonalStatement`, `rephraseBulletPoint`, `suggestSkills`, `improveDescription`

#### `lib/careers-advisor-ai.ts` — 1 AI function

Same pattern. Function: `generateCareersReport`

#### `lib/content-generator.ts` — 3 AI functions

Same pattern. Functions: `generateOutline`, `generateLessonContent`, `generateQuizForLesson`

#### `lib/survey-ai.ts` — 4 AI functions

Same pattern. Functions: `generateSurveyFromTopic`, `generateSurveyFromFiles`, `generateSurveySummary`, `generateSurveyComparative`, `generateSurveyRecommendations`

### 4.4 Update the 2 API Routes with Direct AI Calls

#### `app/api/super-admin/training/generate-quiz/route.ts`

```ts
// REMOVE
const MODEL = 'google/gemini-2.5-flash'

// ADD
import { TEXT_MODEL } from '@/lib/ai-provider'

// Change:
const { text } = await generateText({ model: MODEL, prompt, maxRetries: 3 })
// To:
const { text } = await generateText({ model: TEXT_MODEL, prompt, maxRetries: 3 })
```

#### `app/api/super-admin/library/generate/route.ts`

This is the most complex route — it uses 3 different AI models:

```ts
// REMOVE
import { generateText, experimental_generateImage as generateImage } from 'ai'
const TEXT_MODEL = 'google/gemini-2.5-flash'
const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'
const IMAGEN_FALLBACK = 'google/imagen-4.0-generate-001'

// ADD
import { generateText, experimental_generateImage as generateImage } from 'ai'
import { TEXT_MODEL, IMAGE_MODEL } from '@/lib/ai-provider'
```

**Text generation** (title/description from filename):
```ts
// Same as before — just uses imported TEXT_MODEL
const { text } = await generateText({ model: TEXT_MODEL, prompt: textPrompt, maxRetries: 3 })
```

**Image generation** (AI thumbnails) — replace both Gemini Image and Imagen fallback with a single DALL-E 3 call:
```ts
// REMOVE the dual Gemini Image → Imagen fallback approach
// REPLACE WITH single DALL-E 3 call:
try {
  const { images } = await generateImage({
    model: IMAGE_MODEL,
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
  })

  const generated = images[0]
  if (generated?.base64) {
    const mimeType = 'image/png'
    const imageBuffer = Buffer.from(generated.base64, 'base64')
    thumbnailUrl = (await uploadBlob(
      `library/thumbnails/ai-generated-${Date.now()}.png`,
      imageBuffer,
      mimeType
    ))
  } else {
    imageError = 'DALL-E 3 returned no image data'
  }
} catch (imgErr) {
  const errMsg = imgErr instanceof Error ? imgErr.message : String(imgErr)
  imageError = `DALL-E 3: ${errMsg}`
}
```

> **Key simplification:** The current code has a two-tier image generation fallback (Gemini Image Preview → Imagen 4). With Azure OpenAI DALL-E 3, you only need one call — no fallback chain. DALL-E 3 is reliable and doesn't need the multimodal text+image workaround that Gemini uses.

### 4.5 Model Capability Comparison

| Feature | Current (Gemini) | Azure OpenAI | Notes |
|---|---|---|---|
| Text generation | `gemini-2.5-flash` | `gpt-4o` | GPT-4o is comparable quality; slightly different prompt style |
| JSON output | Regex extraction from freeform text | Same approach works; or use `response_format: { type: "json_object" }` | Consider adding structured output later |
| Image generation | `gemini-3.1-flash-image-preview` + `imagen-4.0-generate-001` | `dall-e-3` | Single model, no fallback needed |
| Max retries | `maxRetries: 3` (built into AI SDK) | Same — AI SDK handles this | No change |
| Rate limits | Gemini free tier limits | Azure OpenAI has per-deployment TPM/RPM limits | Set capacity in deployment (Phase 1.6) |

### 4.6 Prompt Adjustments

All existing prompts work with GPT-4o without modification. However, two minor optimisations are recommended:

1. **JSON reliability:** GPT-4o is better at following JSON instructions. The `extractJson()` helper (strips code fences) can remain as a safety net but will rarely be needed.

2. **UK English:** GPT-4o defaults to US English. The existing prompts already specify "UK English" where needed (CV AI, Careers Advisor). No additional changes required.

---

## Phase 5 — Authentication & Secrets

### 5.1 Update `NEXTAUTH_URL`

```
NEXTAUTH_URL=https://asd-training-app.azurewebsites.net
```

Or if using a custom domain:
```
NEXTAUTH_URL=https://training.yourdomain.org.uk
```

### 5.2 Update OAuth Redirect URIs

**Google Cloud Console** (APIs & Services → Credentials → OAuth 2.0 Client):
```
https://asd-training-app.azurewebsites.net/api/auth/callback/google
```

**Azure AD App Registration** (Azure Portal → App Registrations → Redirect URIs):
```
https://asd-training-app.azurewebsites.net/api/auth/callback/azure-ad
```

> Keep the old Vercel redirect URIs until the DNS cutover is complete, then remove them.

### 5.3 Set All Environment Variables in Azure App Service

```bash
az webapp config appsettings set \
  --name asd-training-app \
  --resource-group asd-training-rg \
  --settings \
  DATABASE_URL="postgresql://asdadmin:<PASSWORD>@asd-training-db.postgres.database.azure.com:5432/asd_training?sslmode=require" \
  DIRECT_URL="postgresql://asdadmin:<PASSWORD>@asd-training-db.postgres.database.azure.com:5432/asd_training?sslmode=require" \
  NEXTAUTH_SECRET="<EXISTING_SECRET>" \
  NEXTAUTH_URL="https://asd-training-app.azurewebsites.net" \
  AZURE_OPENAI_RESOURCE_NAME="asd-training-openai" \
  AZURE_OPENAI_API_KEY="<FROM_PHASE_1.6>" \
  GOOGLE_CLIENT_ID="<EXISTING>" \
  GOOGLE_CLIENT_SECRET="<EXISTING>" \
  AZURE_AD_CLIENT_ID="<EXISTING>" \
  AZURE_AD_CLIENT_SECRET="<EXISTING>" \
  AZURE_AD_TENANT_ID="common" \
  RESEND_API_KEY="<EXISTING>" \
  AZURE_STORAGE_CONNECTION_STRING="<FROM_PHASE_1.4>"
```

### 5.4 (Optional) Move Secrets to Azure Key Vault

For production hardening, store sensitive values in Key Vault and reference them:

```bash
# Create Key Vault
az keyvault create \
  --name asd-training-kv \
  --resource-group asd-training-rg \
  --location uksouth

# Store a secret
az keyvault secret set \
  --vault-name asd-training-kv \
  --name DatabaseUrl \
  --value "postgresql://..."

# Grant App Service access via Managed Identity
az webapp identity assign \
  --name asd-training-app \
  --resource-group asd-training-rg

az keyvault set-policy \
  --name asd-training-kv \
  --object-id <MANAGED_IDENTITY_PRINCIPAL_ID> \
  --secret-permissions get list

# Reference in App Service settings:
# @Microsoft.KeyVault(SecretUri=https://asd-training-kv.vault.azure.net/secrets/DatabaseUrl/)
```

---

## Phase 6 — Next.js Configuration Updates

### 6.1 Enable Standalone Output

Azure App Service doesn't have Vercel's build system. Use Next.js standalone output:

Add to `next.config.js`:
```js
const nextConfig = {
  output: 'standalone',
  // ... existing config
}
```

This produces a self-contained `server.js` in `.next/standalone/` that runs without `node_modules`.

### 6.2 Update CSP Headers (`next.config.js`)

```js
// REPLACE these domains:
// img-src:    https://*.public.blob.vercel-storage.com  →  https://asdtrainingstorage.blob.core.windows.net
// media-src:  https://*.public.blob.vercel-storage.com  →  https://asdtrainingstorage.blob.core.windows.net
// connect-src: https://generativelanguage.googleapis.com  →  https://asd-training-openai.openai.azure.com

// FULL UPDATED CSP:
"Content-Security-Policy": [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://via.placeholder.com https://placehold.co https://asdtrainingstorage.blob.core.windows.net",
  "font-src 'self'",
  "connect-src 'self' https://asd-training-openai.openai.azure.com",
  "media-src 'self' https://asdtrainingstorage.blob.core.windows.net",
  "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'self'",
].join('; ')
```

### 6.3 Update `images.remotePatterns` (if needed)

If any images are served from Azure Blob Storage via `next/image`:
```js
images: {
  remotePatterns: [
    { hostname: 'via.placeholder.com' },
    { hostname: 'placehold.co' },
    { hostname: 'asdtrainingstorage.blob.core.windows.net' },
  ],
},
```

---

## Phase 7 — CI/CD with GitHub Actions

### 7.1 Create Workflow File — `.github/workflows/deploy.yml` (NEW)

```yaml
name: Build and Deploy to Azure

on:
  push:
    branches: [main]

env:
  AZURE_WEBAPP_NAME: asd-training-app
  NODE_VERSION: '22'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run tests
        run: npx vitest run
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Build Next.js (standalone)
        run: npx next build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
          AZURE_OPENAI_RESOURCE_NAME: ${{ secrets.AZURE_OPENAI_RESOURCE_NAME }}
          AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_API_KEY }}
          AZURE_STORAGE_CONNECTION_STRING: ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          AZURE_AD_CLIENT_ID: ${{ secrets.AZURE_AD_CLIENT_ID }}
          AZURE_AD_CLIENT_SECRET: ${{ secrets.AZURE_AD_CLIENT_SECRET }}
          AZURE_AD_TENANT_ID: ${{ secrets.AZURE_AD_TENANT_ID }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}

      - name: Prepare standalone output
        run: |
          cp -r .next/static .next/standalone/.next/static
          cp -r public .next/standalone/public

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .next/standalone
```

### 7.2 Get the Azure Publish Profile

```bash
az webapp deployment list-publishing-profiles \
  --name asd-training-app \
  --resource-group asd-training-rg \
  --xml
```

Copy the XML output and add it as a GitHub repository secret named `AZURE_WEBAPP_PUBLISH_PROFILE`.

### 7.3 Add All Secrets to GitHub

In GitHub → Settings → Secrets and variables → Actions, add:

| Secret Name | Value |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | (XML from above) |
| `DATABASE_URL` | Azure PostgreSQL connection string |
| `DIRECT_URL` | Azure PostgreSQL direct connection string |
| `NEXTAUTH_SECRET` | (existing secret) |
| `NEXTAUTH_URL` | `https://asd-training-app.azurewebsites.net` |
| `AZURE_OPENAI_RESOURCE_NAME` | `asd-training-openai` |
| `AZURE_OPENAI_API_KEY` | (from Phase 1.6) |
| `AZURE_STORAGE_CONNECTION_STRING` | (from Phase 1.4) |
| `GOOGLE_CLIENT_ID` | (existing) |
| `GOOGLE_CLIENT_SECRET` | (existing) |
| `AZURE_AD_CLIENT_ID` | (existing) |
| `AZURE_AD_CLIENT_SECRET` | (existing) |
| `AZURE_AD_TENANT_ID` | `common` |
| `RESEND_API_KEY` | (existing) |

---

## Phase 8 — Remove Vercel Dependencies

```bash
# Remove Vercel config directory
rm -rf .vercel/

# Remove Vercel-specific packages
npm uninstall @vercel/blob @ai-sdk/openai

# Remove from .env.local
# - VERCEL_OIDC_TOKEN
# - BLOB_READ_WRITE_TOKEN
# - Any VERCEL_* environment variables

# Remove test script (no longer needed)
rm scripts/test-ai-gateway.ts

# Clean up package.json — verify no remaining @vercel/* deps
grep -r "@vercel" package.json
```

---

## Migration Sequence (Recommended Order)

| Step | Action | Est. Time |
|---|---|---|
| 1 | Create all Azure resources (Phase 1) | 2–3 hours |
| 2 | Migrate database from Neon to Azure PostgreSQL (Phase 2) | 1–2 hours |
| 3 | Verify Prisma connects to Azure PostgreSQL | 30 min |
| 4 | Replace Vercel Blob with Azure Blob Storage (Phase 3.1–3.3) | 1 day |
| 5 | Switch AI from Gemini to Azure OpenAI (Phase 4) | 3–4 hours |
| 6 | Update `next.config.js` — standalone output + CSP (Phase 6) | 30 min |
| 7 | Set up GitHub Actions CI/CD (Phase 7) | 1–2 hours |
| 8 | Configure env vars and auth (Phase 5) | 1 hour |
| 9 | Deploy to Azure and smoke test | 1–2 hours |
| 10 | Migrate existing files from Vercel Blob to Azure Blob (Phase 3.4) | 1–2 hours |
| 11 | Update blob URLs in database (Phase 3.5) | 30 min |
| 12 | Remove Vercel dependencies (Phase 8) | 30 min |
| 13 | DNS cutover — custom domain to Azure App Service | 1 hour |
| 14 | Monitor for 48h, then decommission Vercel project | — |
| | **Total** | **~4–5 days** |

---

## Critical Files to Modify

| File | Change |
|---|---|
| `lib/ai-provider.ts` | **New** — Azure OpenAI provider config (`createAzure`) |
| `lib/azure-storage.ts` | **New** — Azure Blob Storage helper (`uploadBlob`, `deleteBlob`) |
| `lib/gemini.ts` | `MODEL` string → `TEXT_MODEL` import from `ai-provider` |
| `lib/cv-ai.ts` | Same — `MODEL` → `TEXT_MODEL` |
| `lib/careers-advisor-ai.ts` | Same — `MODEL` → `TEXT_MODEL` |
| `lib/content-generator.ts` | Same — `MODEL` → `TEXT_MODEL` |
| `lib/survey-ai.ts` | Same — `MODEL` → `TEXT_MODEL` |
| `app/api/super-admin/training/generate-quiz/route.ts` | `MODEL` → `TEXT_MODEL` import |
| `app/api/super-admin/library/generate/route.ts` | `TEXT_MODEL` + `IMAGE_MODEL` imports, simplify image gen to DALL-E 3 |
| `app/api/super-admin/training/upload/route.ts` | `put` → `uploadBlob` |
| `app/api/super-admin/library/upload/route.ts` | `put` → `uploadBlob` |
| `app/api/super-admin/library/generate/route.ts` | `put` → `uploadBlob` (also AI changes above) |
| `app/api/super-admin/training/lessons/[lessonId]/attachments/route.ts` | `put` → `uploadBlob` |
| `app/api/super-admin/training/lessons/[lessonId]/attachments/[attachmentId]/route.ts` | `del` → `deleteBlob` |
| `app/api/super-admin/library/[id]/documents/[docId]/route.ts` | `del` → `deleteBlob` |
| `next.config.js` | Add `output: 'standalone'`, update CSP domains |
| `package.json` | Remove `@vercel/blob`, `@ai-sdk/openai`; add `@azure/storage-blob`, `@ai-sdk/azure` |
| `.github/workflows/deploy.yml` | **New** — GitHub Actions CI/CD pipeline |

---

## Environment Variables — Full Reference

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Azure PostgreSQL | `postgresql://asdadmin:***@asd-training-db.postgres.database.azure.com:5432/asd_training?sslmode=require` |
| `DIRECT_URL` | Azure PostgreSQL | Same as `DATABASE_URL` (no separate pooler on Azure) |
| `NEXTAUTH_SECRET` | Existing | Keep the same value to preserve existing sessions |
| `NEXTAUTH_URL` | Azure App Service URL | `https://asd-training-app.azurewebsites.net` |
| `AZURE_OPENAI_RESOURCE_NAME` | Phase 1.6 | `asd-training-openai` |
| `AZURE_OPENAI_API_KEY` | Phase 1.6 | From `az cognitiveservices account keys list` |
| `AZURE_STORAGE_CONNECTION_STRING` | Phase 1.4 | From `az storage account show-connection-string` |
| `GOOGLE_CLIENT_ID` | Existing | Google OAuth — no change |
| `GOOGLE_CLIENT_SECRET` | Existing | Google OAuth — no change |
| `AZURE_AD_CLIENT_ID` | Existing | Azure AD SSO — no change |
| `AZURE_AD_CLIENT_SECRET` | Existing | Azure AD SSO — no change |
| `AZURE_AD_TENANT_ID` | Existing | `common` for personal + work accounts |
| `RESEND_API_KEY` | Existing | Email — no change |

**Removed variables:** `GEMINI_API_KEY`, `VERCEL_OIDC_TOKEN`, `BLOB_READ_WRITE_TOKEN`

---

## What Does NOT Change

- All Next.js App Router pages and layouts
- Prisma schema (43 models, 10 enums) — identical PostgreSQL dialect
- All Prisma queries and data access layer (`lib/training-db.ts`, `lib/sessions.ts`, etc.)
- NextAuth configuration (Credentials + Google + Azure AD providers)
- Azure AD SSO (already configured)
- SAML SSO (`OrgSsoConfig`, `CharitySsoConfig`)
- Resend email (works from any host)
- All business logic, UI components, middleware, and RBAC
- CV Builder and Careers Advisor workflows
- Survey system and reporting
- Training content CMS and quiz system
- Document library structure
- Integration API keys system
- MFA/TOTP enforcement
- All AI prompt text (works with GPT-4o without modification)

---

## Verification Checklist

After deployment, test each area:

- [ ] **Auth:** Login with email/password, Google SSO, Azure AD SSO
- [ ] **MFA:** TOTP setup and verification for admin roles
- [ ] **Dashboard:** All role-specific dashboards render correctly
- [ ] **Training:** View programs, complete lessons, take quizzes
- [ ] **AI Quiz Generation:** Generate quiz questions from lesson content
- [ ] **AI Observations:** Generate observation summaries, patterns, action guidance, insight reports
- [ ] **CV Builder:** Create CV, AI personal statement, AI bullet rephrasing, AI skill suggestions
- [ ] **Careers Advisor:** Complete questionnaire, generate AI report, download PDF
- [ ] **Surveys:** Create survey (AI-generated), respond, view results, generate AI insights
- [ ] **Document Library:** Upload documents, AI-generate metadata + thumbnail, download
- [ ] **File Uploads:** Training images, lesson attachments, library documents
- [ ] **Email:** Forgot password email sends via Resend
- [ ] **Sessions:** Create virtual classroom sessions, manage attendees
- [ ] **Reports:** Super admin and org admin reports render with correct data
- [ ] **CSP Headers:** No blocked resources in browser console
- [ ] **HTTPS:** All traffic over TLS, HSTS header present

---

## Estimated Total Effort

| Work | Time |
|---|---|
| Azure infrastructure setup (all resources) | 2–3 hours |
| Database migration (Neon → Azure PostgreSQL) | 1–2 hours |
| Vercel Blob → Azure Blob Storage (6 routes + helper) | 1 day |
| AI migration (Gemini → Azure OpenAI, 9 files) | 3–4 hours |
| Next.js config + CSP updates | 30 min |
| CI/CD pipeline (GitHub Actions) | 1–2 hours |
| Auth + env var configuration | 1 hour |
| File migration + URL updates in DB | 1–2 hours |
| Testing & verification | 1 day |
| DNS cutover + monitoring | 1 day |
| **Total** | **~4–5 days** |
