export interface AssemblyInput {
  purpose: string
  tone: string
  requirements: string[]
  exampleOutput: string | null
  inputVariables: string[]
  responseFormat: string
  contextFiles: Array<{ fileName: string; parsedText: string }>
}

/**
 * Assemble the final prompt string that goes to the model.
 * Pure function — no Prisma, no network, safe to unit-test.
 */
export function assemblePrompt(
  input: AssemblyInput,
  values: Record<string, string>,
): string {
  const parts: string[] = []

  parts.push(input.purpose.trim())

  if (input.tone.trim()) {
    parts.push(input.tone.trim())
  }

  const inputLines = input.inputVariables.map((name) => {
    const v = values[name] ?? ''
    return `${name}: ${v}`
  })
  if (inputLines.length > 0) {
    parts.push(inputLines.join('\n'))
  }

  if (input.requirements.length > 0) {
    parts.push(
      'Requirements:\n' + input.requirements.map((r) => `- ${r}`).join('\n'),
    )
  }

  if (input.contextFiles.length > 0) {
    const body = input.contextFiles
      .map((f) => `--- FILE: ${f.fileName} ---\n${f.parsedText}`)
      .join('\n\n')
    parts.push(`Reference material:\n${body}`)
  }

  if (input.exampleOutput && input.exampleOutput.trim()) {
    parts.push(`Example output:\n${input.exampleOutput.trim()}`)
  }

  parts.push(input.responseFormat.trim())

  return parts.join('\n\n')
}
