/**
 * Authentication Helper for API Tests
 * Handles login and session management for non-UI tests
 */

import { APIRequestContext } from '@playwright/test'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  userId: string
  cookies: Array<{ name: string; value: string; domain: string; path: string }>
}

/**
 * Login with test credentials and return session tokens
 */
export async function login(
  request: APIRequestContext,
  baseURL: string = 'http://localhost:3000'
): Promise<AuthSession> {
  // Step 1: Login with email/password
  const loginResponse = await request.post(`${baseURL}/auth/login`, {
    data: {
      email: 'test@playwright.local',
      password: 'TestPassword123!'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!loginResponse.ok()) {
    throw new Error(`Login failed: ${loginResponse.status()} ${await loginResponse.text()}`)
  }

  // Extract cookies from response (Playwright format)
  const cookieArray: Array<{ name: string; value: string; domain: string; path: string }> = []

  try {
    const setCookieHeaders = loginResponse.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie')
    for (const header of setCookieHeaders) {
      const [nameValue] = header.value.split(';')
      const [name, value] = nameValue.split('=')
      if (name && value) {
        cookieArray.push({
          name: name.trim(),
          value: value.trim(),
          domain: 'localhost',
          path: '/'
        })
      }
    }
  } catch (e) {
    // Cookie parsing failed, but we can still use tokens from JSON response
    console.warn('Cookie parsing failed:', e)
  }

  // Step 2: Get session data from response
  const responseData = await loginResponse.json()

  return {
    accessToken: responseData.access_token || '',
    refreshToken: responseData.refresh_token || '',
    userId: responseData.user?.id || '',
    cookies: cookieArray
  }
}

/**
 * Create authenticated request headers
 */
export function getAuthHeaders(session: AuthSession): Record<string, string> {
  return {
    'Authorization': `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Get cookie string for authenticated requests
 */
export function getCookieString(session: AuthSession): string {
  return session.cookies.map(c => `${c.name}=${c.value}`).join('; ')
}
