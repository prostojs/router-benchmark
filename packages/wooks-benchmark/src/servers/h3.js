import { H3, HTTPError, serve, getCookie, setCookie, getRouterParam, readBody } from 'h3'
import { AUTH_TOKEN, SESSION_COOKIE, isValidBody } from '../routes.js'
import { createDb } from '../simulate-db.js'

// Idiomatic h3 v2: route middleware for auth (runs before the handler reads the
// body), web-standard request/response, served through h3's own `serve()` (srvx).
function headerAuth(event) {
  if (event.req.headers.get('authorization') !== `Bearer ${AUTH_TOKEN}`) {
    throw new HTTPError({ status: 401, message: 'Unauthorized' })
  }
}

function cookieAuth(event) {
  if (getCookie(event, 'session') !== SESSION_COOKIE) {
    throw new HTTPError({ status: 401, message: 'Unauthorized' })
  }
}

async function readValidBody(event) {
  const body = await readBody(event)
  if (!isValidBody(body)) throw new HTTPError({ status: 400, message: 'Invalid body' })
  return body
}

const headerGuard = { middleware: [headerAuth] }
const cookieGuard = { middleware: [cookieAuth] }

export async function createServer({ simulateDb } = {}) {
  const db = simulateDb ? createDb() : null
  const app = new H3({ silent: true }) // no console logging (aborted sockets at run end)

  // --- Public routes ---

  app.get('/', () => 'ok')

  app.get('/health', () => 'ok')

  app.post('/auth/login', async (event) => {
    await readValidBody(event)
    if (db) await db.set('session')
    setCookie(event, 'session', SESSION_COOKIE, { path: '/', httpOnly: true })
    event.res.status = 201
    return 'token'
  })

  app.get('/static/**', (event) => {
    event.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return 'file'
  })

  app.get('/api/v1/docs/**', (event) => {
    event.res.headers.set('Cache-Control', 'public, max-age=3600')
    return 'doc'
  })

  // --- Header-auth guarded routes ---

  app.get('/api/v1/users', async () => {
    if (db) await db.get('users')
    return 'users'
  }, headerGuard)

  app.get('/api/v1/users/:userId', async (event) => {
    if (db) await db.get('user')
    return getRouterParam(event, 'userId')
  }, headerGuard)

  app.get('/api/v1/users/:userId/profile', async (event) => {
    if (db) await db.get('profile')
    return getRouterParam(event, 'userId')
  }, headerGuard)

  app.get('/api/v1/projects', async () => {
    if (db) await db.get('projects')
    return 'projects'
  }, headerGuard)

  app.post('/api/v1/projects', async (event) => {
    await readValidBody(event)
    if (db) await db.set('project')
    event.res.status = 201
    return 'created'
  }, headerGuard)

  app.get('/api/v1/projects/:projectId', async (event) => {
    if (db) await db.get('project')
    return getRouterParam(event, 'projectId')
  }, headerGuard)

  app.delete('/api/v1/projects/:projectId', async (event) => {
    if (db) await db.del('project')
    return getRouterParam(event, 'projectId')
  }, headerGuard)

  app.get('/api/v1/organizations/settings/billing/invoices', async (event) => {
    if (db) await db.get('invoices')
    event.res.headers.set('Cache-Control', 'private, no-cache')
    return 'invoices'
  }, headerGuard)

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', async (event) => {
    if (db) await db.get('members')
    return getRouterParam(event, 'projectId')
  }, cookieGuard)

  app.get('/api/v1/projects/:projectId/tasks', async (event) => {
    if (db) await db.get('tasks')
    return getRouterParam(event, 'projectId')
  }, cookieGuard)

  app.get('/api/v1/projects/:projectId/tasks/:taskId', async (event) => {
    if (db) await db.get('task')
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.put('/api/v1/projects/:projectId/tasks/:taskId', async (event) => {
    await readValidBody(event)
    if (db) await db.set('task')
    event.res.status = 201
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', async (event) => {
    if (db) await db.del('task')
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', async (event) => {
    if (db) await db.get('comments')
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async (event) => {
    await readValidBody(event)
    if (db) await db.set('comment')
    event.res.status = 201
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', async (event) => {
    if (db) await db.get('task')
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.get('/api/v1/organizations/settings/billing/payment-methods', async (event) => {
    if (db) await db.get('methods')
    event.res.headers.set('Cache-Control', 'private, no-cache')
    return 'methods'
  }, cookieGuard)

  const server = serve(app, { port: 0, hostname: '127.0.0.1', silent: true, gracefulShutdown: false })
  await server.ready()
  return { port: server.node.server.address().port }
}
