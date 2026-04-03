'use client'

import { User, Mail, Phone, MapPin, Hash, Linkedin } from 'lucide-react'
import { CvStepLayout } from '@/components/cv-builder/cv-step-layout'
import { ExampleText } from '@/components/cv-builder/example-text'

interface StepProps {
  cvId: string
  data: any
  onUpdate: (fields: Record<string, any>) => void
  onSectionChange?: () => void
}

const INPUT_CLASS =
  'w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors'

const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'

export function PersonalDetailsStep({ data, onUpdate }: StepProps) {
  const fields = [
    {
      name: 'fullName',
      label: 'Full name',
      icon: User,
      placeholder: 'e.g. Alex Johnson',
      type: 'text',
    },
    {
      name: 'email',
      label: 'Email address',
      icon: Mail,
      placeholder: 'e.g. alex.johnson@email.com',
      type: 'email',
    },
    {
      name: 'phone',
      label: 'Phone number',
      icon: Phone,
      placeholder: 'e.g. 07700 900123',
      type: 'tel',
    },
    {
      name: 'city',
      label: 'City or town',
      icon: MapPin,
      placeholder: 'e.g. Manchester',
      type: 'text',
    },
    {
      name: 'postcode',
      label: 'Postcode',
      icon: Hash,
      placeholder: 'e.g. M1 1AA',
      type: 'text',
    },
    {
      name: 'linkedIn',
      label: 'LinkedIn profile (optional)',
      icon: Linkedin,
      placeholder: 'e.g. linkedin.com/in/alexjohnson',
      type: 'url',
    },
  ]

  return (
    <CvStepLayout
      stepNumber={1}
      title="Your Details"
      description="Let's start with your contact information. Employers use this to get in touch with you."
    >
      <ExampleText>
        You don&apos;t need to include your full address — just your city or town is fine.
      </ExampleText>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {fields.map((field) => {
          const Icon = field.icon
          return (
            <div key={field.name} className={field.name === 'linkedIn' ? 'sm:col-span-2' : ''}>
              <label htmlFor={`cv-${field.name}`} className={LABEL_CLASS}>
                {field.label}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  id={`cv-${field.name}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  defaultValue={data?.[field.name] || ''}
                  onChange={(e) => onUpdate({ [field.name]: e.target.value })}
                  className={`${INPUT_CLASS} pl-9`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </CvStepLayout>
  )
}
