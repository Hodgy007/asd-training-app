import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/survey-db', () => ({
  getSurveyForUser: vi.fn(),
  submitSurveyResponse: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { getSurveyForUser, submitSurveyResponse } from '@/lib/survey-db'
import { POST } from '../route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/surveys/s1/respond', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = { params: { surveyId: 's1' } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: 'u1', role: 'LEARNER', organisationId: 'o1' },
  } as never)
  vi.mocked(getSurveyForUser).mockResolvedValue({
    id: 's1',
    questions: [
      { id: 'q1', required: true },
      { id: 'q2', required: false },
    ],
  } as never)
  vi.mocked(submitSurveyResponse).mockResolvedValue({ id: 'r1' } as never)
})

describe('POST /api/surveys/[surveyId]/respond', () => {
  it('drops answers whose questionId is not part of this survey', async () => {
    const res = await POST(
      req({
        answers: [
          { questionId: 'q1', value: 'yes' },
          { questionId: 'FOREIGN', value: 'injected' },
        ],
      }),
      params,
    )
    expect(res.status).toBe(201)
    const passed = vi.mocked(submitSurveyResponse).mock.calls[0]![2]
    expect(passed).toEqual([{ questionId: 'q1', value: 'yes' }])
  })

  it('400 when a required question is unanswered (foreign ids do not satisfy it)', async () => {
    const res = await POST(
      req({ answers: [{ questionId: 'FOREIGN', value: 'x' }] }),
      params,
    )
    expect(res.status).toBe(400)
    expect(vi.mocked(submitSurveyResponse)).not.toHaveBeenCalled()
  })

  it('coerces and caps answer values to a string', async () => {
    const long = 'a'.repeat(20_000)
    const res = await POST(
      req({ answers: [{ questionId: 'q1', value: long }, { questionId: 'q2', value: 42 }] }),
      params,
    )
    expect(res.status).toBe(201)
    const passed = vi.mocked(submitSurveyResponse).mock.calls[0]![2] as Array<{ questionId: string; value: string }>
    const q1 = passed.find((a) => a.questionId === 'q1')!
    expect(q1.value.length).toBe(10_000)
    const q2 = passed.find((a) => a.questionId === 'q2')!
    expect(q2.value).toBe('42')
  })
})
