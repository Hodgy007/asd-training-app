import { describe, it, expect } from 'vitest'
import { classifyAssetPath } from '../brand-assets-classify'

describe('classifyAssetPath', () => {
  it('classifies typical brand-kit folder layouts', () => {
    expect(classifyAssetPath('Logos/primary.png', 'OTHER')).toBe('LOGO')
    expect(classifyAssetPath('logos/wordmark.svg', 'OTHER')).toBe('LOGO')
    expect(classifyAssetPath('Brand Guidelines/2024.pdf', 'OTHER')).toBe('BRAND_GUIDELINES')
    expect(classifyAssetPath('brand-book/v3.pdf', 'OTHER')).toBe('BRAND_GUIDELINES')
    expect(classifyAssetPath('Style Guide/typography.pdf', 'OTHER')).toBe('BRAND_GUIDELINES')
    expect(classifyAssetPath('Colour Palette/swatches.pdf', 'OTHER')).toBe('COLOUR_PALETTE')
    expect(classifyAssetPath('color_palette/main.pdf', 'OTHER')).toBe('COLOUR_PALETTE')
    expect(classifyAssetPath('Imagery/photo1.jpg', 'OTHER')).toBe('IMAGERY')
    expect(classifyAssetPath('Photos/event-2025.jpg', 'OTHER')).toBe('IMAGERY')
    expect(classifyAssetPath('Tone of Voice/principles.pdf', 'OTHER')).toBe('MESSAGING')
    expect(classifyAssetPath('messaging/keylines.docx', 'OTHER')).toBe('MESSAGING')
  })

  it('matches keywords in the filename when there is no folder', () => {
    expect(classifyAssetPath('primary-logo.png', 'OTHER')).toBe('LOGO')
    expect(classifyAssetPath('brand-guidelines-2024.pdf', 'OTHER')).toBe('BRAND_GUIDELINES')
    expect(classifyAssetPath('palette.png', 'OTHER')).toBe('COLOUR_PALETTE')
    expect(classifyAssetPath('tone-of-voice.pdf', 'OTHER')).toBe('MESSAGING')
  })

  it('prefers more-specific BRAND_GUIDELINES over LOGO when both keywords appear', () => {
    expect(classifyAssetPath('brand-guidelines-with-logos.pdf', 'OTHER')).toBe('BRAND_GUIDELINES')
  })

  it('falls back to the supplied default when nothing matches', () => {
    expect(classifyAssetPath('random-file.pdf', 'OTHER')).toBe('OTHER')
    expect(classifyAssetPath('untitled.png', 'IMAGERY')).toBe('IMAGERY')
    expect(classifyAssetPath('random.pdf', 'BRAND_GUIDELINES')).toBe('BRAND_GUIDELINES')
  })

  it('handles backslash-separated paths (Windows zip exports)', () => {
    expect(classifyAssetPath('Logos\\primary.png', 'OTHER')).toBe('LOGO')
    expect(classifyAssetPath('Brand Guidelines\\v3.pdf', 'OTHER')).toBe('BRAND_GUIDELINES')
  })

  it('is case-insensitive', () => {
    expect(classifyAssetPath('LOGOS/PRIMARY.PNG', 'OTHER')).toBe('LOGO')
    expect(classifyAssetPath('IMAGERY/PHOTO.JPG', 'OTHER')).toBe('IMAGERY')
  })

  it('does not falsely match unrelated words containing the substring', () => {
    // "ratiology" should not match "logo"; the rule is \blogos?\b
    expect(classifyAssetPath('ratiology.pdf', 'OTHER')).toBe('OTHER')
    // "voicemail" should not match \bvoice\b
    expect(classifyAssetPath('voicemail-recording.mp4', 'OTHER')).toBe('OTHER')
  })
})
