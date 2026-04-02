/**
 * @vitest-environment node
 *
 * api-response uses NextResponse which requires a polyfilled Request/Response.
 * We mock next/server to test the pure logic without Next.js runtime.
 */
import { describe, it, expect, vi } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedResponse = { body: any, status: number }

// Mock NextResponse.json to return a plain object
vi.mock('next/server', () => ({
  NextResponse: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: (body: any, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

import { success, error, ApiError } from '../api-response'

// ─── success() ────────────────────────────────────────────────────

describe('success', () => {
  it('returns correct shape', () => {
    const res = success({ id: '123' }) as unknown as MockedResponse
    expect(res.body).toEqual({ success: true, data: { id: '123' } })
    expect(res.status).toBe(200)
  })

  it('supports custom status code', () => {
    const res = success('created', 201) as unknown as MockedResponse
    expect(res.status).toBe(201)
  })
})

// ─── error() ──────────────────────────────────────────────────────

describe('error', () => {
  it('returns correct shape', () => {
    const res = error('Something went wrong', 400, 'BAD_REQUEST') as unknown as MockedResponse
    expect(res.body).toEqual({
      success: false,
      error: { message: 'Something went wrong', code: 'BAD_REQUEST' },
    })
    expect(res.status).toBe(400)
  })

  it('defaults to status 400', () => {
    const res = error('Oops') as unknown as MockedResponse
    expect(res.status).toBe(400)
  })
})

// ─── ApiError shortcuts ───────────────────────────────────────────

describe('ApiError', () => {
  const cases = [
    { method: 'badRequest' as const, status: 400, code: 'BAD_REQUEST' },
    { method: 'unauthorized' as const, status: 401, code: 'UNAUTHORIZED' },
    { method: 'forbidden' as const, status: 403, code: 'FORBIDDEN' },
    { method: 'notFound' as const, status: 404, code: 'NOT_FOUND' },
    { method: 'conflict' as const, status: 409, code: 'CONFLICT' },
    { method: 'internal' as const, status: 500, code: 'INTERNAL_ERROR' },
  ]

  for (const { method, status, code } of cases) {
    it(`${method}() returns ${status} with code ${code}`, () => {
      const res = ApiError[method]() as unknown as MockedResponse
      expect(res.status).toBe(status)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe(code)
    })
  }

  it('supports custom error messages', () => {
    const res = ApiError.notFound('Payment link not found') as unknown as MockedResponse
    expect(res.body.error.message).toBe('Payment link not found')
  })
})
