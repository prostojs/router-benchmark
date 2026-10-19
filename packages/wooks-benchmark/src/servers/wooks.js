import { createHttpApp, useRouteParams, useHeaders, useResponse, useCookies, HttpError } from '@wooksjs/event-http'
import { useBody } from '@wooksjs/http-body'
import { createServer as createHttpServer } from 'node:http'
import { createDb } from 'bench-utils/simulate-db'
import { BEARER, SESSION_COOKIE, isValidBody } from '../routes.js'

// Idiomatic Wooks: auth and body parsing are composables called from the handler,
// so auth runs before the body is read.
function requireHeaderAuth() {
  if (useHeaders().authorization !== BEARER) {
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

  app.get('/api/v1/users', () => {
    requireHeaderAuth()
    return db ? db.get('users').then(() => 'users') : 'users'
  })

  app.get('/api/v1/users/:userId', () => {
    requireHeaderAuth()
    const userId = useRouteParams().get('userId')
    return db ? db.get('user').then(() => userId) : userId
  })

  app.get('/api/v1/users/:userId/profile', () => {
    requireHeaderAuth()
    const userId = useRouteParams().get('userId')
    return db ? db.get('profile').then(() => userId) : userId
  })

  app.get('/api/v1/projects', () => {
    requireHeaderAuth()
    return db ? db.get('projects').then(() => 'projects') : 'projects'
  })

  app.post('/api/v1/projects', async () => {
    requireHeaderAuth()
    await readValidBody()
    if (db) await db.set('project')
    return 'created'
  })

  app.get('/api/v1/projects/:projectId', () => {
    requireHeaderAuth()
    const projectId = useRouteParams().get('projectId')
    return db ? db.get('project').then(() => projectId) : projectId
  })

  app.delete('/api/v1/projects/:projectId', () => {
    requireHeaderAuth()
    const projectId = useRouteParams().get('projectId')
    return db ? db.del('project').then(() => projectId) : projectId
  })

  app.get('/api/v1/organizations/settings/billing/invoices', () => {
    requireHeaderAuth()
    useResponse().setHeader('Cache-Control', 'private, no-cache')
    return db ? db.get('invoices').then(() => 'invoices') : 'invoices'
  })

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', () => {
    requireCookieAuth()
    const projectId = useRouteParams().get('projectId')
    return db ? db.get('members').then(() => projectId) : projectId
  })

  app.get('/api/v1/projects/:projectId/tasks', () => {
    requireCookieAuth()
    const projectId = useRouteParams().get('projectId')
    return db ? db.get('tasks').then(() => projectId) : projectId
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId', () => {
    requireCookieAuth()
    const taskId = useRouteParams().get('taskId')
    return db ? db.get('task').then(() => taskId) : taskId
  })

  app.put('/api/v1/projects/:projectId/tasks/:taskId', async () => {
    requireCookieAuth()
    await readValidBody()
    if (db) await db.set('task')
    return useRouteParams().get('taskId')
  })

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', () => {
    requireCookieAuth()
    const taskId = useRouteParams().get('taskId')
    return db ? db.del('task').then(() => taskId) : taskId
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', () => {
    requireCookieAuth()
    const taskId = useRouteParams().get('taskId')
    return db ? db.get('comments').then(() => taskId) : taskId
  })

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async () => {
    requireCookieAuth()
    await readValidBody()
    if (db) await db.set('comment')
    return useRouteParams().get('taskId')
  })

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', () => {
    requireCookieAuth()
    const taskId = useRouteParams().get('taskId')
    return db ? db.get('task').then(() => taskId) : taskId
  })

  app.get('/api/v1/organizations/settings/billing/payment-methods', () => {
    requireCookieAuth()
    useResponse().setHeader('Cache-Control', 'private, no-cache')
    return db ? db.get('methods').then(() => 'methods') : 'methods'
  })

  const server = createHttpServer(app.getServerCb())
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { server }
}
