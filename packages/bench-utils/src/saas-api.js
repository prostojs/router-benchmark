/**
 * Shared definition of the "project management SaaS API" workload used by the
 * wooks and moost HTTP benchmarks: auth constants, request fixtures and the
 * test cases with the exact responses every server must produce.
 */
export const AUTH_TOKEN = 'benchmark-token'
export const SESSION_COOKIE = 'benchmark-session'

/** Minimal body validation every server performs on parsed JSON bodies. */
export function isValidBody(body) {
  return typeof body === 'object' && body !== null
}

// Realistic cookie jar — ~20 cookies typical for a logged-in browser session
// (session, analytics, consent, feature flags, A/B testing). The session cookie
// sits in the middle so a parser cannot stop early.
export const cookieJar = [
  `_ga=GA1.1.1234567890.1706000000`,
  `_ga_ABCDEF1234=GS1.1.1706000000.42.1.1706003600.0.0.0`,
  `_gid=GA1.1.9876543210.1706000000`,
  `_fbp=fb.1.1706000000000.ABCDefgh1234567890`,
  `_gcl_au=1.1.1234567890.1706000000`,
  `chat-session-abc123=eHlhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODk=`,
  `chat-id-abc123=a1b2c3d4-e5f6-7890-abcd-ef1234567890`,
  `ajs_user_id=usr_abc123def456ghi789jkl012mno345`,
  `ajs_anonymous_id=anon_98765432-1abc-def0-1234-567890abcdef`,
  `csrf_token=dGhpc19pc19hX2xvbmdfY3NyZl90b2tlbl92YWx1ZV90aGF0X2lzXzY0X2NoYXJz`,
  `cookie_consent=analytics:true|marketing:true|functional:true|necessary:true`,
  `theme=dark`,
  `locale=en-US`,
  `timezone=America/New_York`,
  `session=${SESSION_COOKIE}`,
  `ab_experiments=exp_checkout_v2:B|exp_nav_redesign:A|exp_pricing:C|exp_onboard:B`,
  `feature_flags=ff_new_dashboard:1|ff_beta_api:1|ff_export_csv:0|ff_dark_mode:1`,
  `_dd_s=rum=1&id=abc123def456&created=1706000000000&expire=1706003600000`,
  `amp_id_abcdef1234=eyJkZXZpY2VJZCI6ImFiYzEyMy1kZWY0NTYtZ2hpNzg5In0=`,
  `visitor_utk=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`,
].join('; ')

// Large JSON body — 100-item task list (~25 KB), realistic for bulk operations
export const largeBody = JSON.stringify({
  tasks: Array.from({ length: 100 }, (_, i) => ({
    id: `tsk_${String(i + 1).padStart(4, '0')}`,
    title: `Task ${i + 1}: Implement feature ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
    description: `Detailed description for task ${i + 1}. This involves updating the ${['frontend', 'backend', 'database', 'API', 'infrastructure'][i % 5]} component.`,
    status: ['todo', 'in_progress', 'review', 'done'][i % 4],
    priority: ['low', 'medium', 'high', 'critical'][i % 4],
    assignee: `usr_${String(100 + (i % 20)).padStart(3, '0')}`,
    labels: [`label_${i % 5}`, `sprint_${Math.floor(i / 10) + 1}`],
    estimatedHours: (i % 8) + 1,
    createdAt: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
    updatedAt: new Date(Date.UTC(2024, 5, 1 + i)).toISOString(),
  })),
})

export const smallBody = JSON.stringify({ text: 'Great work!' })

const json = { 'content-type': 'application/json' }
const bearer = { authorization: `Bearer ${AUTH_TOKEN}` }
const cookie = { cookie: cookieJar }

const CC_IMMUTABLE = 'public, max-age=31536000, immutable'
const CC_DOCS = 'public, max-age=3600'
const CC_PRIVATE = 'private, no-cache'

/**
 * Benchmark test cases — each runs independently under autocannon.
 *
 * expect        — required status code (anything else counts as an error)
 * expectBody    — exact response body every server must return (checked in pre-flight)
 * expectHeaders — exact response header values (checked in pre-flight)
 * expectSetCookie — Set-Cookie must match all of these patterns
 *
 * Weights model realistic SaaS traffic (sum = 100):
 *   cookie-auth reads 42, cookie-auth writes 18, header-auth 16, public 10,
 *   auth failures 5, 404s 5, bot/scanner 4
 */
export const tests = [
  // --- Public (10) ---
  { name: 'Short static', method: 'GET', path: '/health', headers: {}, expect: 200, expectBody: 'ok', weight: 3 },
  {
    name: 'Login (set-cookie)', method: 'POST', path: '/auth/login', headers: { ...json },
    body: JSON.stringify({ username: 'admin', password: 'secret' }), expect: 201, expectBody: 'token', weight: 2,
    expectSetCookie: [/^session=benchmark-session;/, /;\s*Path=\/(;|$)/i, /;\s*HttpOnly(;|$)/i],
  },
  { name: 'Wildcard + cache', method: 'GET', path: '/static/css/main.bundle.min.css', headers: {}, expect: 200, expectBody: 'file', expectHeaders: { 'cache-control': CC_IMMUTABLE }, weight: 3 },
  { name: 'Wildcard deep', method: 'GET', path: '/api/v1/docs/guides/getting-started/introduction', headers: {}, expect: 200, expectBody: 'doc', expectHeaders: { 'cache-control': CC_DOCS }, weight: 2 },

  // --- Header-auth / API clients (16) ---
  { name: 'Header-auth static', method: 'GET', path: '/api/v1/projects', headers: { ...bearer }, expect: 200, expectBody: 'projects', weight: 4 },
  { name: 'Header-auth param', method: 'GET', path: '/api/v1/users/usr_abc123', headers: { ...bearer }, expect: 200, expectBody: 'usr_abc123', weight: 6 },
  { name: 'Header-auth long static + cache', method: 'GET', path: '/api/v1/organizations/settings/billing/invoices', headers: { ...bearer }, expect: 200, expectBody: 'invoices', expectHeaders: { 'cache-control': CC_PRIVATE }, weight: 3 },
  { name: 'Header-auth POST small body', method: 'POST', path: '/api/v1/projects', headers: { ...bearer, ...json }, body: JSON.stringify({ name: 'Project X' }), expect: 201, expectBody: 'created', weight: 3 },

  // --- Auth failures (5) ---
  { name: 'Header-auth FAIL (401)', method: 'GET', path: '/api/v1/users/usr_abc123', headers: {}, expect: 401, weight: 2 },

  // --- Cookie-auth / browser users (60) ---
  { name: 'Cookie-auth param+suffix', method: 'GET', path: '/api/v1/projects/prj_001/members', headers: { ...cookie }, expect: 200, expectBody: 'prj_001', weight: 14 },
  { name: 'Cookie-auth two params', method: 'GET', path: '/api/v1/projects/prj_001/tasks/tsk_042', headers: { ...cookie }, expect: 200, expectBody: 'tsk_042', weight: 20 },
  { name: 'Cookie-auth four params', method: 'GET', path: '/api/v1/orgs/org_1/teams/team_5/projects/prj_001/tasks/tsk_042', headers: { ...cookie }, expect: 200, expectBody: 'tsk_042', weight: 8 },
  { name: 'Cookie-auth POST small body', method: 'POST', path: '/api/v1/projects/prj_001/tasks/tsk_042/comments', headers: { ...cookie, ...json }, body: smallBody, expect: 201, expectBody: 'tsk_042', weight: 8 },
  { name: 'Cookie-auth PUT small body', method: 'PUT', path: '/api/v1/projects/prj_001/tasks/tsk_042', headers: { ...cookie, ...json }, body: JSON.stringify({ title: 'Updated task', status: 'done' }), expect: 201, expectBody: 'tsk_042', weight: 8 },
  { name: 'Cookie-auth POST large body', method: 'POST', path: '/api/v1/projects/prj_001/tasks/tsk_042/comments', headers: { ...cookie, ...json }, body: largeBody, expect: 201, expectBody: 'tsk_042', weight: 2 },
  { name: 'Cookie-auth FAIL (401)', method: 'GET', path: '/api/v1/projects/prj_001/tasks/tsk_042', headers: {}, expect: 401, weight: 3 },

  // --- 404 (5) ---
  { name: '404 short', method: 'GET', path: '/not-found', headers: {}, expect: 404, weight: 3 },
  { name: '404 deep', method: 'GET', path: '/api/v1/this/does/not/exist', headers: {}, expect: 404, weight: 2 },

  // --- Bot/scanner: large body + bad credentials (4) ---
  { name: 'POST large body + bad header-auth', method: 'POST', path: '/api/v1/projects', headers: { ...json }, body: largeBody, expect: 401, weight: 2 },
  { name: 'POST large body + bad cookie-auth', method: 'POST', path: '/api/v1/projects/prj_001/tasks/tsk_042/comments', headers: { ...json }, body: largeBody, expect: 401, weight: 2 },
]

/** Bodies that must be rejected with 400 by every server (checked in pre-flight only). */
export const validationChecks = [
  { name: 'Invalid JSON body (400)', method: 'POST', path: '/api/v1/projects/prj_001/tasks/tsk_042/comments', headers: { ...cookie, ...json }, body: '{"text":', expect: 400 },
  { name: 'Non-object JSON body (400)', method: 'POST', path: '/api/v1/projects', headers: { ...bearer, ...json }, body: '"just a string"', expect: 400 },
]
