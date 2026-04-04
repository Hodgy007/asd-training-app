'use client'

import { useEffect, useState } from 'react'
import { Modal } from './modal'
import { QrCode, Printer } from 'lucide-react'

interface CredentialCardModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  email: string
  temporaryPassword: string
}

export function CredentialCardModal({
  isOpen,
  onClose,
  userName,
  email,
  temporaryPassword,
}: CredentialCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const loginUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/login?email=${encodeURIComponent(email)}`
    : ''

  useEffect(() => {
    if (!isOpen || !loginUrl) return
    let cancelled = false

    async function generateQR() {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(loginUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      })
      if (!cancelled) setQrDataUrl(dataUrl)
    }

    generateQR()
    return () => { cancelled = true }
  }, [isOpen, loginUrl])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* Printable credential card */}
      <div id="credential-card-print-area" className="credential-card-print-area">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="32,4 60,56 4,56" fill="#f5821f" />
              <polygon points="32,18 50,50 14,50" fill="#fcaf17" opacity="0.75" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Your Login Credentials</h2>
          <p className="text-sm text-slate-500 mt-1">Ambitious about Autism</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div className="bg-white p-3 rounded-xl border border-calm-200">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Login QR Code" width={180} height={180} />
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center">
                <QrCode className="h-12 w-12 text-slate-300 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mb-5">
          Scan this QR code to open the login page
        </p>

        {/* Credentials */}
        <div className="bg-calm-50 rounded-xl p-4 space-y-3 border border-calm-200">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Website</p>
            <p className="text-sm font-mono text-slate-800 break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</p>
            <p className="text-sm font-semibold text-slate-800">{userName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</p>
            <p className="text-sm font-mono text-slate-800">{email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Temporary Password</p>
            <p className="text-base font-mono font-bold text-slate-900 bg-white rounded-lg px-3 py-2 border border-calm-300 tracking-wider">
              {temporaryPassword}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-800 text-center font-medium">
            Please change your password after your first login.
          </p>
        </div>
      </div>

      {/* Action buttons — hidden during print */}
      <div className="no-print flex gap-3 mt-6 pt-4 border-t border-calm-200">
        <button
          onClick={() => window.print()}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Card
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-xl border border-calm-200 text-slate-700 hover:bg-calm-50 transition font-medium"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
