'use client'

import { useEffect, useState } from 'react'
import { Modal } from './modal'
import { QrCode, Printer, Mail, Check, Loader2 } from 'lucide-react'

interface CredentialCardModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  email: string
  temporaryPassword: string
}

export function CredentialCardModal({
  isOpen,
  onClose,
  userId,
  userName,
  email,
  temporaryPassword,
}: CredentialCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [inviteState, setInviteState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)

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

  async function handleSendInvite() {
    setInviteState('sending')
    setInviteError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/invite`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to send invite')
      }
      setInviteState('sent')
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed to send invite')
      setInviteState('error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* Printable credential card */}
      <div id="credential-card-print-area" className="credential-card-print-area">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-16 w-auto mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Your Login Credentials</h2>
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

      {/* Error banner — above action buttons */}
      {inviteState === 'error' && inviteError && (
        <div className="no-print mt-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {inviteError}
        </div>
      )}

      {/* Action buttons — hidden during print */}
      <div className="no-print flex flex-wrap gap-3 mt-6 pt-4 border-t border-calm-200">
        <button
          onClick={handleSendInvite}
          disabled={inviteState === 'sending' || inviteState === 'sent'}
          className="btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {inviteState === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : inviteState === 'sent' ? (
            <>
              <Check className="h-4 w-4" />
              Sent
            </>
          ) : inviteState === 'error' ? (
            <>
              <Mail className="h-4 w-4" />
              Retry email
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Email invite
            </>
          )}
        </button>
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
