import { StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

// A4 page: 595.28 x 841.89 points
// Built-in font: Helvetica (no registration needed)

export const colours = {
  primary: '#f97316',    // orange
  text: '#1e293b',       // slate-800
  muted: '#64748b',      // slate-500
  light: '#f1f5f9',      // slate-100
  border: '#cbd5e1',     // slate-300
  white: '#ffffff',
}

// ---------- shared types ----------

export interface CVWorkExperience {
  id: string
  jobTitle: string
  employer: string
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string | null
  order: number
}

export interface CVEducation {
  id: string
  institution: string
  qualification: string
  grade: string | null
  startDate: string
  endDate: string | null
  description: string | null
  order: number
}

export interface CVSkill {
  id: string
  name: string
  category: string | null
  order: number
}

export interface CVReference {
  id: string
  name: string
  jobTitle: string | null
  organisation: string | null
  email: string | null
  phone: string | null
  relationship: string | null
  order: number
}

export interface CVDataForPDF {
  id: string
  title: string
  template: 'ACCESSIBLE' | 'MODERN' | 'CLASSIC'
  fullName: string | null
  email: string | null
  phone: string | null
  city: string | null
  postcode: string | null
  linkedIn: string | null
  personalStatement: string | null
  interests: string | null
  refsAvailableOnRequest: boolean
  workExperiences: CVWorkExperience[]
  educationEntries: CVEducation[]
  skills: CVSkill[]
  references: CVReference[]
}

// ---------- helpers ----------

export function formatDateRange(start: string, end: string | null, isCurrent?: boolean): string {
  if (isCurrent) return `${start} \u2013 Present`
  if (!end) return start
  return `${start} \u2013 ${end}`
}

export function contactLine(cv: CVDataForPDF): string {
  const parts: string[] = []
  if (cv.email) parts.push(cv.email)
  if (cv.phone) parts.push(cv.phone)
  if (cv.city && cv.postcode) parts.push(`${cv.city}, ${cv.postcode}`)
  else if (cv.city) parts.push(cv.city)
  else if (cv.postcode) parts.push(cv.postcode)
  if (cv.linkedIn) parts.push(cv.linkedIn)
  return parts.join('  |  ')
}

// ---------- shared components ----------

// Section heading with a bottom border
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SectionHeading({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <Text
      style={[
        {
          fontSize: 13,
          fontFamily: 'Helvetica-Bold',
          color: colours.text,
          marginBottom: 6,
          paddingBottom: 3,
          borderBottomWidth: 1,
          borderBottomColor: colours.border,
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

// Bullet list from a multi-line string (splits on newlines or bullet chars)
export function BulletList({ text, fontSize = 11 }: { text: string; fontSize?: number }) {
  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/^[\u2022\u2023\u25E6\-\*]\s*/, '').trim())
    .filter(Boolean)

  return (
    <View style={{ marginTop: 2 }}>
      {lines.map((line, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text style={{ fontSize, color: colours.text, width: 12 }}>{'\u2022'}</Text>
          <Text style={{ fontSize, color: colours.text, flex: 1, lineHeight: 1.4 }}>{line}</Text>
        </View>
      ))}
    </View>
  )
}
