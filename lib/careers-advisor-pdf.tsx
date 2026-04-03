import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { AdvisorReport } from '@/types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1e293b',
  },
  header: {
    marginBottom: 24,
    borderBottom: '2 solid #f5821f',
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#f5821f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #e2e8f0',
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155',
  },
  careerCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  careerName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 3,
  },
  careerExplanation: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 4,
  },
  stepNumber: {
    width: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#3b82f6',
    fontSize: 11,
  },
  stepText: {
    flex: 1,
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
  },
  disclaimer: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
})

interface Props {
  report: AdvisorReport
  userName?: string
}

export function CareersAdvisorPDF({ report, userName }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Careers Report</Text>
          <Text style={styles.headerSubtitle}>
            {userName ? `Prepared for ${userName}` : 'Personalised careers guidance'} — {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Strengths */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Strengths</Text>
          <Text style={styles.paragraph}>{report.strengths}</Text>
        </View>

        {/* Career Areas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Career Areas</Text>
          {report.careers.map((career, i) => (
            <View key={i} style={styles.careerCard}>
              <Text style={styles.careerName}>{career.name}</Text>
              <Text style={styles.careerExplanation}>{career.explanation}</Text>
            </View>
          ))}
        </View>

        {/* Next Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Steps</Text>
          {report.nextSteps.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <Text style={styles.stepNumber}>{i + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Workplace Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workplace Support</Text>
          <Text style={styles.paragraph}>{report.workplaceSupport}</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text>
            This report is for guidance only and does not constitute professional careers advice. Share it with your careers professional to discuss next steps.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
