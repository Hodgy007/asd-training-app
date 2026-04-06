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
