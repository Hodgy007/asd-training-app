import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { colours, formatDateRange, BulletList } from './shared'
import type { CVDataForPDF } from './shared'

/*
 * MODERN template
 * - Two-column layout: left sidebar (30%) + main area (70%)
 * - Left sidebar: light grey background with contact, skills, interests
 * - Main area: name, personal statement, work experience, education, references
 * - Orange accent on section headings
 * - 11pt body text, clean sans-serif look
 */

const SIDEBAR_WIDTH = '30%'
const MAIN_WIDTH = '70%'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: colours.text,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colours.light,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  main: {
    width: MAIN_WIDTH,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 24,
    paddingRight: 40,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colours.text,
    marginBottom: 16,
  },
  sidebarHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colours.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 16,
  },
  sidebarText: {
    fontSize: 10,
    color: colours.text,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  mainHeading: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: colours.primary,
    marginBottom: 6,
    marginTop: 14,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  entryTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colours.text,
  },
  entrySubtitle: {
    fontSize: 10,
    color: colours.muted,
    marginBottom: 2,
  },
  entryDates: {
    fontSize: 9,
    color: colours.muted,
    marginBottom: 3,
  },
  body: {
    fontSize: 11,
    color: colours.text,
    lineHeight: 1.5,
  },
  skillBadge: {
    backgroundColor: colours.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 9,
    color: colours.text,
    marginBottom: 4,
    marginRight: 4,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  refBlock: {
    marginBottom: 8,
  },
})

export function ModernTemplate({ cv }: { cv: CVDataForPDF }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ---------- SIDEBAR ---------- */}
        <View style={styles.sidebar}>
          {/* Contact */}
          <Text style={[styles.sidebarHeading, { marginTop: 0 }]}>Contact</Text>
          {cv.email && <Text style={styles.sidebarText}>{cv.email}</Text>}
          {cv.phone && <Text style={styles.sidebarText}>{cv.phone}</Text>}
          {cv.city && (
            <Text style={styles.sidebarText}>
              {cv.city}
              {cv.postcode ? `, ${cv.postcode}` : ''}
            </Text>
          )}
          {cv.linkedIn && <Text style={styles.sidebarText}>{cv.linkedIn}</Text>}

          {/* Skills */}
          {cv.skills.length > 0 && (
            <>
              <Text style={styles.sidebarHeading}>Skills</Text>
              <View style={styles.skillsRow}>
                {cv.skills.map((skill) => (
                  <Text key={skill.id} style={styles.skillBadge}>
                    {skill.name}
                  </Text>
                ))}
              </View>
            </>
          )}

          {/* Interests */}
          {cv.interests && (
            <>
              <Text style={styles.sidebarHeading}>Interests</Text>
              <Text style={styles.sidebarText}>{cv.interests}</Text>
            </>
          )}
        </View>

        {/* ---------- MAIN ---------- */}
        <View style={styles.main}>
          {/* Name */}
          <Text style={styles.name}>{cv.fullName || 'Your Name'}</Text>

          {/* Personal Statement */}
          {cv.personalStatement && (
            <>
              <Text style={[styles.mainHeading, { marginTop: 0 }]}>Personal Statement</Text>
              <Text style={styles.body}>{cv.personalStatement}</Text>
            </>
          )}

          {/* Work Experience */}
          {cv.workExperiences.length > 0 && (
            <>
              <Text style={styles.mainHeading}>Work Experience</Text>
              {cv.workExperiences.map((exp) => (
                <View key={exp.id} style={{ marginBottom: 10 }}>
                  <Text style={styles.entryTitle}>{exp.jobTitle}</Text>
                  <Text style={styles.entrySubtitle}>{exp.employer}</Text>
                  <Text style={styles.entryDates}>
                    {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                  </Text>
                  {exp.description && <BulletList text={exp.description} />}
                </View>
              ))}
            </>
          )}

          {/* Education */}
          {cv.educationEntries.length > 0 && (
            <>
              <Text style={styles.mainHeading}>Education</Text>
              {cv.educationEntries.map((edu) => (
                <View key={edu.id} style={{ marginBottom: 10 }}>
                  <Text style={styles.entryTitle}>{edu.qualification}</Text>
                  <Text style={styles.entrySubtitle}>
                    {edu.institution}
                    {edu.grade ? ` \u2014 ${edu.grade}` : ''}
                  </Text>
                  <Text style={styles.entryDates}>
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </Text>
                  {edu.description && <BulletList text={edu.description} />}
                </View>
              ))}
            </>
          )}

          {/* References */}
          {(cv.references.length > 0 || cv.refsAvailableOnRequest) && (
            <>
              <Text style={styles.mainHeading}>References</Text>
              {cv.refsAvailableOnRequest && cv.references.length === 0 ? (
                <Text style={styles.body}>Available on request.</Text>
              ) : (
                <>
                  {cv.references.map((ref) => (
                    <View key={ref.id} style={styles.refBlock}>
                      <Text style={styles.entryTitle}>{ref.name}</Text>
                      {ref.jobTitle && (
                        <Text style={styles.entrySubtitle}>
                          {ref.jobTitle}
                          {ref.organisation ? `, ${ref.organisation}` : ''}
                        </Text>
                      )}
                      {ref.email && <Text style={styles.entryDates}>{ref.email}</Text>}
                      {ref.phone && <Text style={styles.entryDates}>{ref.phone}</Text>}
                    </View>
                  ))}
                  {cv.refsAvailableOnRequest && (
                    <Text style={[styles.body, { fontStyle: 'italic', fontSize: 10 }]}>
                      Additional references available on request.
                    </Text>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </Page>
    </Document>
  )
}
