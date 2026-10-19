import { createHttpApp, useRouteParams, useHeaders, useResponse, useCookies, HttpError } from '@wooksjs/event-http'
import { useBody } from '@wooksjs/http-body'
import { createServer as createHttpServer } from 'node:http'
import { AUTH_TOKEN, SESSION_COOKIE, isValidBody } from '../routes.js'
import { createDb } from '../simulate-db.js'

// Idiomatic Wooks: auth and body parsing are composables called from the handler,
// so auth runs before the body is read.
function requireHeaderAuth() {
  if (useHeaders().authorization !== `Bearer ${AUTH_TOKEN}`) {
    throw new HttpError(401, 'Unauthorized')
  }
}

function requireCookieAuth() {
  if (useCookies().getCookie('session') !== SESSION_COOKIE) {
    throw new HttpError(401, 'Unauthorized')
  }
}

async function readValidBody() {
  const body = await useBody().parseBody()
  if (!isValidBody(body)) throw new HttpError(400, 'Invalid body')
  return body
}

export async function createServer({ simulateDb } = {}) {
  const db = simulateDb ? createDb() : null
  const app = createHttpApp()

  // --- Public routes ---

  app.get('/', () => 'ok')

  app.get('/health', () => 'ok')

  app.post('/auth/login', async () => {
    await readValidBody()
    if (db) await db.set('session')
    useResponse().setCookie('session', SESSION_COOKIE, { path: '/', httpOnly: true })
    return 'token'
  })

  app.get('/static/*', () => {
    useResponse().setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    return 'file'
  })

  app.get('/api/v1/docs/*', () => {
    useResponse().setHeader('Cache-Control', 'public, max-age=3600')
    return 'doc'
  })

  // --- Header-auth guarded routes ---

  app.get('/api/v1/users', async () => {
    requireHeaderAuth()
    if (db) await db.get('users')
    return 'users'
  })

  app.get('/api/v1/users/:userId', async () => {
    requireHeaderAuth()
    if (db) await db.get('user')
    return useRouteParams().get('userId')
  })

  app.get('/api/v1/users/:userId/profile', async () => {
    requireHeaderAuth()
    if (db) await db.get('profile')
    return useRouteParams().get('userId')
  })

  app.get('/api/v1/projects', async () => {
    requireHeaderAuth()
    if (db) await db.get('projects')
    return 'projects'
  })

  app.post('/api/v1/projects', async () => {
    requireHeaderAuth()
    await readValidBody()
    if (db) await db.set('project')
    return 'created'
  })

  app.get('/api/v1/projects/:projectId', async () => {
    requireHeaderAuth()
    if (db) await db.get('project')
    return useRouteParams().get('projectId')
  })

  app.delete('/api/v1/projects/:projectId', async () => {
    requireHeaderAuth()
    if (db) await db.del('project')
    return useRouteParams().get('projectId')
  })

  app.get('/api/v1/organizations/settings/billing/invoices', async () => {
    requireHeaderAuth()
    if (db) await db.get('invoices')
    useResponse().setHeader('Cache-Control', 'private, no-cache')
    return 'invoices'
  })

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', async () => {
    requireCookieAuth()
    if (db) await db.get('members')
    return useRouteParams().get('projectId')
  })

  app.get('/api/v1/projects/:projectId/tasks', async () => {
    requireCookieAuth()
    if (db) await db.get('tasks')
    return useRouteParams().get('projectId')
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId', async () => {
    requireCookieAuth()
    if (db) await db.get('task')
    return useRouteParams().get('taskId')
  })

  app.put('/api/v1/projects/:projectId/tasks/:taskId', async () => {
    requireCookieAuth()
    await readValidBody()
    if (db) await db.set('task')
    return useRouteParams().get('taskId')
  })

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', async () => {
    requireCookieAuth()
    if (db) await db.del('task')
    return useRouteParams().get('taskId')
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', async () => {
    requireCookieAuth()
    if (db) await db.get('comments')
    return useRouteParams().get('taskId')
  })

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async () => {
    requireCookieAuth()
    await readValidBody()
    if (db) await db.set('comment')
    return useRouteParams().get('taskId')
  })

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', async () => {
    requireCookieAuth()
    if (db) await db.get('task')
    return useRouteParams().get('taskId')
  })

  app.get('/api/v1/organizations/settings/billing/payment-methods', async () => {
    requireCookieAuth()
    if (db) await db.get('methods')
    useResponse().setHeader('Cache-Control', 'private, no-cache')
    return 'methods'
  })

  const server = createHttpServer(app.getServerCb())
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { port: server.address().port }
}
