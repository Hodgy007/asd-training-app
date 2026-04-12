import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    color: '#1e293b',
    position: 'relative',
  },
  topBorder: {
    height: 30,
    backgroundColor: '#f5821f',
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 24,
  },
  certifiesText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  learnerName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  completedText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  moduleName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#f5821f',
    marginBottom: 8,
    textAlign: 'center',
  },
  programName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  dateLine: {
    fontSize: 12,
    color: '#1e293b',
    marginBottom: 8,
  },
  orgName: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  bottomLine: {
    fontSize: 10,
    color: '#6b7280',
  },
})

interface CertificateProps {
  name: string
  moduleName: string
  programName: string
  date: string
  orgName: string
}

export function CertificatePDF({ name, moduleName, programName, date, orgName }: CertificateProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topBorder} />
        <View style={styles.content}>
          <Text style={styles.heading}>Certificate of Completion</Text>
          <Text style={styles.certifiesText}>This certifies that</Text>
          <Text style={styles.learnerName}>{name}</Text>
          <Text style={styles.completedText}>has successfully completed</Text>
          <Text style={styles.moduleName}>{moduleName}</Text>
          <Text style={styles.programName}>{programName}</Text>
          <Text style={styles.dateLine}>Completed on {date}</Text>
          <Text style={styles.orgName}>{orgName}</Text>
          <Text style={styles.bottomLine}>Ambitious about Autism Training Platform</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderCertificateToBuffer(props: CertificateProps): Promise<Buffer> {
  const buffer = await renderToBuffer(
    React.createElement(CertificatePDF, props) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  )
  return Buffer.from(buffer)
}

/* ────────────────────────────────────────────────────────────── */
/*  Program-level certificate (awarded on completing ALL modules) */
/* ────────────────────────────────────────────────────────────── */

const programStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    color: '#1e293b',
    position: 'relative',
  },
  topBorder: {
    height: 30,
    backgroundColor: '#f5821f',
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 28,
  },
  certifiesText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  learnerName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  completedText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  programName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#f5821f',
    marginBottom: 16,
    textAlign: 'center',
  },
  modulesList: {
    marginBottom: 20,
    alignItems: 'center',
  },
  moduleLine: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  dateLine: {
    fontSize: 12,
    color: '#1e293b',
    marginBottom: 8,
  },
  orgName: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  bottomLine: {
    fontSize: 10,
    color: '#6b7280',
  },
})

interface ProgramCertificateProps {
  name: string
  programName: string
  modules: string[]
  date: string
  orgName: string
}

export function ProgramCertificatePDF({ name, programName, modules, date, orgName }: ProgramCertificateProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={programStyles.page}>
        <View style={programStyles.topBorder} />
        <View style={programStyles.content}>
          <Text style={programStyles.heading}>Certificate of Completion</Text>
          <Text style={programStyles.certifiesText}>This certifies that</Text>
          <Text style={programStyles.learnerName}>{name}</Text>
          <Text style={programStyles.completedText}>has successfully completed all modules in</Text>
          <Text style={programStyles.programName}>{programName}</Text>
          <View style={programStyles.modulesList}>
            {modules.map((m, i) => (
              <Text key={i} style={programStyles.moduleLine}>
                {'\u2713'} {m}
              </Text>
            ))}
          </View>
          <Text style={programStyles.dateLine}>Completed on {date}</Text>
          <Text style={programStyles.orgName}>{orgName}</Text>
          <Text style={programStyles.bottomLine}>Ambitious about Autism Training Platform</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderProgramCertificateToBuffer(props: ProgramCertificateProps): Promise<Buffer> {
  const buffer = await renderToBuffer(
    React.createElement(ProgramCertificatePDF, props) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  )
  return Buffer.from(buffer)
}
