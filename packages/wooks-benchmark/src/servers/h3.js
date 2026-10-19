import { H3, HTTPError, serve, getCookie, setCookie, getRouterParam, readBody } from 'h3'
import { createDb } from 'bench-utils/simulate-db'
import { BEARER, SESSION_COOKIE, isValidBody } from '../routes.js'

// Idiomatic h3 v2: route middleware for auth (runs before the handler reads the
// body), web-standard request/response, served through h3's own `serve()` (srvx).
function headerAuth(event) {
  if (event.req.headers.get('authorization') !== BEARER) {
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

  app.get('/api/v1/users', () => {
    return db ? db.get('users').then(() => 'users') : 'users'
  }, headerGuard)

  app.get('/api/v1/users/:userId', (event) => {
    const userId = getRouterParam(event, 'userId')
    return db ? db.get('user').then(() => userId) : userId
  }, headerGuard)

  app.get('/api/v1/users/:userId/profile', (event) => {
    const userId = getRouterParam(event, 'userId')
    return db ? db.get('profile').then(() => userId) : userId
  }, headerGuard)

  app.get('/api/v1/projects', () => {
    return db ? db.get('projects').then(() => 'projects') : 'projects'
  }, headerGuard)

  app.post('/api/v1/projects', async (event) => {
    await readValidBody(event)
    if (db) await db.set('project')
    event.res.status = 201
    return 'created'
  }, headerGuard)

  app.get('/api/v1/projects/:projectId', (event) => {
    const projectId = getRouterParam(event, 'projectId')
    return db ? db.get('project').then(() => projectId) : projectId
  }, headerGuard)

  app.delete('/api/v1/projects/:projectId', (event) => {
    const projectId = getRouterParam(event, 'projectId')
    return db ? db.del('project').then(() => projectId) : projectId
  }, headerGuard)

  app.get('/api/v1/organizations/settings/billing/invoices', (event) => {
    event.res.headers.set('Cache-Control', 'private, no-cache')
    return db ? db.get('invoices').then(() => 'invoices') : 'invoices'
  }, headerGuard)

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', (event) => {
    const projectId = getRouterParam(event, 'projectId')
    return db ? db.get('members').then(() => projectId) : projectId
  }, cookieGuard)

  app.get('/api/v1/projects/:projectId/tasks', (event) => {
    const projectId = getRouterParam(event, 'projectId')
    return db ? db.get('tasks').then(() => projectId) : projectId
  }, cookieGuard)

  app.get('/api/v1/projects/:projectId/tasks/:taskId', (event) => {
    const taskId = getRouterParam(event, 'taskId')
    return db ? db.get('task').then(() => taskId) : taskId
  }, cookieGuard)

  app.put('/api/v1/projects/:projectId/tasks/:taskId', async (event) => {
    await readValidBody(event)
    if (db) await db.set('task')
    event.res.status = 201
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', (event) => {
    const taskId = getRouterParam(event, 'taskId')
    return db ? db.del('task').then(() => taskId) : taskId
  }, cookieGuard)

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', (event) => {
    const taskId = getRouterParam(event, 'taskId')
    return db ? db.get('comments').then(() => taskId) : taskId
  }, cookieGuard)

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async (event) => {
    await readValidBody(event)
    if (db) await db.set('comment')
    event.res.status = 201
    return getRouterParam(event, 'taskId')
  }, cookieGuard)

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', (event) => {
    const taskId = getRouterParam(event, 'taskId')
    return db ? db.get('task').then(() => taskId) : taskId
  }, cookieGuard)

  app.get('/api/v1/organizations/settings/billing/payment-methods', (event) => {
    event.res.headers.set('Cache-Control', 'private, no-cache')
    return db ? db.get('methods').then(() => 'methods') : 'methods'
  }, cookieGuard)

  const server = serve(app, { port: 0, hostname: '127.0.0.1', silent: true, gracefulShutdown: false })
  await server.ready()
  return { server: server.node.server }
}
