import React from 'react'
import { Document, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'

// Ambitious about Autism logo, reconstructed from public/logo-aaa.svg
// with CSS classes flattened to explicit fills so @react-pdf/renderer can render it.
function AmbitiousAboutAutismLogo({ width = 220 }: { width?: number }) {
  const height = width * (130 / 380)
  return (
    <Svg viewBox="0 0 380 130" width={width} height={height}>
      <Path fill="#49c7ed" d="M136.54,62.9l-42.68-24.64c-2.55-1.47-4.64-.27-4.64,2.68v9.1l22.27,12.86c2.55,1.47,2.55,3.88,0,5.36l-22.27,12.86v9.1c0,2.95,2.09,4.15,4.64,2.68l42.68-24.64c2.55-1.47,2.55-3.88,0-5.36Z" />
      <Path fill="#b2d235" d="M68.82,38.26c-2.55-1.47-4.64-.27-4.64,2.68v8.59l23.16,13.37c1.12.64,1.74,1.47,1.88,2.31v-15.17l-20.41-11.78Z" />
      <Path fill="#b2d235" d="M87.34,68.26l-23.16,13.37v8.59c0,2.95,2.09,4.15,4.64,2.68l20.41-11.78v-15.17c-.14.85-.77,1.67-1.88,2.31Z" />
      <Path fill="#3bb14a" d="M111.5,62.9l-22.27-12.86v15.17c.04.24.04.49,0,.73v15.17l22.27-12.86c2.55-1.47,2.55-3.88,0-5.36Z" />
      <Path fill="#fdb813" d="M44.66,38.26c-2.55-1.47-4.64-.27-4.64,2.68v49.28c0,2.95,2.09,4.15,4.64,2.68l19.52-11.27v-32.1l-19.52-11.27Z" />
      <Path fill="#f48220" d="M89.22,65.94v-.73c-.14-.85-.77-1.67-1.88-2.31l-23.16-13.37v32.1l23.16-13.37c1.12-.64,1.74-1.47,1.88-2.31Z" />
      <Path fill="#f48220" d="M89.22,65.21v.73c.04-.24.04-.49,0-.73Z" />
      <Path fill="#001522" d="M157.26,36.48h5.36l8.88,23.75h-5.42l-1.8-5.29h-8.88l-1.86,5.29h-5.29l9.01-23.75ZM156.76,51.04h6.15l-2.99-8.71h-.07l-3.09,8.71Z" />
      <Path fill="#001522" d="M172.39,43.03h4.46v2.33h.07c1.23-1.76,3.03-2.79,5.26-2.79s4.09.8,5.02,2.86c1-1.5,2.79-2.86,5.19-2.86,3.66,0,6.29,1.7,6.29,6.15v11.51h-4.72v-9.75c0-2.3-.2-4.19-2.89-4.19s-3.16,2.2-3.16,4.36v9.58h-4.72v-9.65c0-2,.13-4.29-2.86-4.29-.93,0-3.19.6-3.19,3.96v9.98h-4.72v-17.2Z" />
      <Path fill="#001522" d="M200.46,36.48h4.72v8.65h.07c1.16-1.76,3.29-2.56,5.42-2.56,3.43,0,7.12,2.76,7.12,9.05s-3.69,9.08-7.12,9.08c-2.53,0-4.62-.77-5.65-2.66h-.07v2.2h-4.49v-23.75ZM209.04,46.12c-2.79,0-4.02,2.63-4.02,5.52s1.23,5.49,4.02,5.49,4.03-2.63,4.03-5.49-1.23-5.52-4.03-5.52Z" />
      <Path fill="#001522" d="M223.77,40.37h-4.72v-3.89h4.72v3.89ZM219.05,43.03h4.72v17.2h-4.72v-17.2Z" />
      <Path fill="#001522" d="M232.42,43.03h3.46v3.16h-3.46v8.52c0,1.6.4,2,2,2,.5,0,.96-.03,1.46-.13v3.69c-.8.13-1.83.17-2.76.17-2.89,0-5.42-.66-5.42-4.09v-10.14h-2.86v-3.16h2.86v-5.16h4.72v5.16Z" />
      <Path fill="#001522" d="M242.27,40.37h-4.72v-3.89h4.72v3.89ZM237.54,43.03h4.72v17.2h-4.72v-17.2Z" />
      <Path fill="#001522" d="M252.14,42.56c5.42,0,8.91,3.59,8.91,9.08s-3.49,9.05-8.91,9.05-8.88-3.59-8.88-9.05,3.49-9.08,8.88-9.08ZM252.14,57.13c3.23,0,4.19-2.76,4.19-5.49s-.96-5.52-4.19-5.52-4.16,2.76-4.16,5.52.96,5.49,4.16,5.49Z" />
      <Path fill="#001522" d="M278.32,60.22h-4.49v-2.4h-.1c-1.2,1.93-3.26,2.86-5.26,2.86-5.02,0-6.29-2.83-6.29-7.08v-10.58h4.72v9.71c0,2.83.83,4.22,3.03,4.22,2.56,0,3.66-1.43,3.66-4.92v-9.01h4.72v17.2Z" />
      <Path fill="#001522" d="M283.9,54.64c.03,2.06,1.76,2.89,3.63,2.89,1.36,0,3.09-.53,3.09-2.2,0-1.43-1.96-1.93-5.35-2.66-2.73-.6-5.46-1.56-5.46-4.59,0-4.39,3.79-5.52,7.48-5.52s7.22,1.26,7.58,5.49h-4.49c-.13-1.83-1.53-2.33-3.23-2.33-1.06,0-2.63.2-2.63,1.6,0,1.7,2.66,1.93,5.36,2.56,2.76.63,5.46,1.63,5.46,4.82,0,4.52-3.92,5.99-7.85,5.99s-7.88-1.5-8.08-6.05h4.49Z" />
      <Path fill="#001522" d="M150.08,77.04c.27-4.42,4.22-5.75,8.08-5.75,3.43,0,7.55.76,7.55,4.89v8.95c0,1.56.17,3.13.6,3.82h-4.79c-.17-.53-.3-1.1-.33-1.66-1.5,1.56-3.69,2.13-5.79,2.13-3.26,0-5.85-1.63-5.85-5.16,0-3.89,2.93-4.82,5.85-5.22,2.89-.43,5.59-.33,5.59-2.26,0-2.03-1.4-2.33-3.06-2.33-1.8,0-2.96.73-3.13,2.59h-4.72ZM160.99,80.53c-.8.7-2.46.73-3.93,1-1.46.3-2.79.8-2.79,2.53s1.36,2.2,2.89,2.2c3.69,0,3.83-2.93,3.83-3.96v-1.76Z" />
      <Path fill="#001522" d="M167.5,65.2h4.72v8.65h.07c1.16-1.76,3.29-2.56,5.42-2.56,3.43,0,7.12,2.76,7.12,9.05s-3.69,9.08-7.12,9.08c-2.53,0-4.62-.77-5.65-2.66h-.07v2.2h-4.49v-23.75ZM176.08,74.84c-2.79,0-4.02,2.63-4.02,5.52s1.23,5.49,4.02,5.49,4.02-2.63,4.02-5.49-1.23-5.52-4.02-5.52Z" />
      <Path fill="#001522" d="M194.77,71.29c5.42,0,8.91,3.59,8.91,9.08s-3.49,9.05-8.91,9.05-8.88-3.59-8.88-9.05,3.49-9.08,8.88-9.08ZM194.77,85.85c3.23,0,4.19-2.76,4.19-5.49s-.96-5.52-4.19-5.52-4.16,2.76-4.16,5.52.96,5.49,4.16,5.49Z" />
      <Path fill="#001522" d="M221.08,88.95h-4.49v-2.39h-.1c-1.2,1.93-3.26,2.86-5.26,2.86-5.02,0-6.29-2.83-6.29-7.08v-10.58h4.72v9.71c0,2.83.83,4.22,3.03,4.22,2.56,0,3.66-1.43,3.66-4.92v-9.01h4.72v17.2Z" />
      <Path fill="#001522" d="M229.59,71.75h3.46v3.16h-3.46v8.52c0,1.6.4,2,2,2,.5,0,.96-.03,1.46-.13v3.69c-.8.13-1.83.17-2.76.17-2.89,0-5.42-.67-5.42-4.09v-10.14h-2.86v-3.16h2.86v-5.16h4.72v5.16Z" />
      <Path fill="#001522" d="M247.75,65.2h5.36l8.88,23.75h-5.42l-1.8-5.29h-8.88l-1.86,5.29h-5.29l9.01-23.75ZM247.25,79.77h6.15l-2.99-8.71h-.07l-3.09,8.71Z" />
      <Path fill="#001522" d="M278.02,88.95h-4.49v-2.39h-.1c-1.2,1.93-3.26,2.86-5.26,2.86-5.02,0-6.29-2.83-6.29-7.08v-10.58h4.72v9.71c0,2.83.83,4.22,3.03,4.22,2.56,0,3.66-1.43,3.66-4.92v-9.01h4.72v17.2Z" />
      <Path fill="#001522" d="M286.53,71.75h3.46v3.16h-3.46v8.52c0,1.6.4,2,2,2,.5,0,.96-.03,1.46-.13v3.69c-.8.13-1.83.17-2.76.17-2.89,0-5.42-.67-5.42-4.09v-10.14h-2.86v-3.16h2.86v-5.16h4.72v5.16Z" />
      <Path fill="#001522" d="M295.71,69.09h-4.72v-3.89h4.72v3.89ZM290.98,71.75h4.72v17.2h-4.72v-17.2Z" />
      <Path fill="#001522" d="M301.16,83.36c.03,2.06,1.76,2.89,3.63,2.89,1.36,0,3.09-.53,3.09-2.2,0-1.43-1.96-1.93-5.35-2.66-2.73-.6-5.46-1.56-5.46-4.59,0-4.39,3.79-5.52,7.48-5.52s7.22,1.26,7.58,5.49h-4.49c-.13-1.83-1.53-2.33-3.23-2.33-1.07,0-2.63.2-2.63,1.6,0,1.7,2.66,1.93,5.36,2.56,2.76.63,5.46,1.63,5.46,4.82,0,4.52-3.93,5.99-7.85,5.99s-7.88-1.5-8.08-6.05h4.49Z" />
      <Path fill="#001522" d="M313.7,71.75h4.46v2.33h.07c1.23-1.76,3.03-2.79,5.26-2.79s4.09.8,5.02,2.86c1-1.5,2.8-2.86,5.19-2.86,3.66,0,6.29,1.7,6.29,6.15v11.51h-4.72v-9.75c0-2.3-.2-4.19-2.89-4.19s-3.16,2.2-3.16,4.36v9.58h-4.72v-9.65c0-2,.13-4.29-2.86-4.29-.93,0-3.19.6-3.19,3.96v9.98h-4.72v-17.2Z" />
    </Svg>
  )
}

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
  logo: {
    marginBottom: 16,
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
          <View style={styles.logo}>
            <AmbitiousAboutAutismLogo width={220} />
          </View>
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
  logo: {
    marginBottom: 16,
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
          <View style={programStyles.logo}>
            <AmbitiousAboutAutismLogo width={240} />
          </View>
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
