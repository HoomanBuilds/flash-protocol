import { NextResponse } from 'next/server'

type ApiSuccessResponse<T> = {
  success: true
  data: T
}

type ApiErrorResponse = {
  success: false
  error: {
    message: string
    code?: string
  }
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Standard success response
export function success<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

// Standard error response
export function error(message: string, status = 400, code?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status }
  )
}

// Common error shortcuts
export const ApiError = {
  badRequest: (message = 'Bad request') => error(message, 400, 'BAD_REQUEST'),
  unauthorized: (message = 'Unauthorized') => error(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => error(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Not found') => error(message, 404, 'NOT_FOUND'),
  conflict: (message = 'Conflict') => error(message, 409, 'CONFLICT'),
  internal: (message = 'Internal server error') => error(message, 500, 'INTERNAL_ERROR'),
}

// Export types for consumers
export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse }
