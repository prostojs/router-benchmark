import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { validator } from 'hono/validator'
import { serve } from '@hono/node-server'
import { AUTH_TOKEN, SESSION_COOKIE, isValidBody } from '../routes.js'
import { createDb } from '../simulate-db.js'

// Idiomatic Hono: per-route middleware for auth, placed before the built-in
// JSON validator so unauthorized requests are rejected without parsing the body.
async function headerAuth(c, next) {
  if (c.req.header('authorization') !== `Bearer ${AUTH_TOKEN}`) return c.text('Unauthorized', 401)
  await next()
}

async function cookieAuth(c, next) {
  if (getCookie(c, 'session') !== SESSION_COOKIE) return c.text('Unauthorized', 401)
  await next()
}

const jsonBody = validator('json', (value, c) => (isValidBody(value) ? value : c.text('Invalid body', 400)))

export async function createServer({ simulateDb } = {}) {
  const db = simulateDb ? createDb() : null
  const app = new Hono()

  // --- Public routes ---

  app.get('/', (c) => c.text('ok'))

  app.get('/health', (c) => c.text('ok'))

  app.post('/auth/login', jsonBody, async (c) => {
    if (db) await db.set('session')
    setCookie(c, 'session', SESSION_COOKIE, { path: '/', httpOnly: true })
    return c.text('token', 201)
  })

  app.get('/static/*', (c) => {
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    return c.text('file')
  })

  app.get('/api/v1/docs/*', (c) => {
    c.header('Cache-Control', 'public, max-age=3600')
    return c.text('doc')
  })

  // --- Header-auth guarded routes ---

  app.get('/api/v1/users', headerAuth, async (c) => {
    if (db) await db.get('users')
    return c.text('users')
  })

  app.get('/api/v1/users/:userId', headerAuth, async (c) => {
    if (db) await db.get('user')
    return c.text(c.req.param('userId'))
  })

  app.get('/api/v1/users/:userId/profile', headerAuth, async (c) => {
    if (db) await db.get('profile')
    return c.text(c.req.param('userId'))
  })

  app.get('/api/v1/projects', headerAuth, async (c) => {
    if (db) await db.get('projects')
    return c.text('projects')
  })

  app.post('/api/v1/projects', headerAuth, jsonBody, async (c) => {
    if (db) await db.set('project')
    return c.text('created', 201)
  })

  app.get('/api/v1/projects/:projectId', headerAuth, async (c) => {
    if (db) await db.get('project')
    return c.text(c.req.param('projectId'))
  })

  app.delete('/api/v1/projects/:projectId', headerAuth, async (c) => {
    if (db) await db.del('project')
    return c.text(c.req.param('projectId'))
  })

  app.get('/api/v1/organizations/settings/billing/invoices', headerAuth, async (c) => {
    if (db) await db.get('invoices')
    c.header('Cache-Control', 'private, no-cache')
    return c.text('invoices')
  })

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', cookieAuth, async (c) => {
    if (db) await db.get('members')
    return c.text(c.req.param('projectId'))
  })

  app.get('/api/v1/projects/:projectId/tasks', cookieAuth, async (c) => {
    if (db) await db.get('tasks')
    return c.text(c.req.param('projectId'))
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, async (c) => {
    if (db) await db.get('task')
    return c.text(c.req.param('taskId'))
  })

  app.put('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, jsonBody, async (c) => {
    if (db) await db.set('task')
    return c.text(c.req.param('taskId'), 201)
  })

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, async (c) => {
    if (db) await db.del('task')
    return c.text(c.req.param('taskId'))
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, async (c) => {
    if (db) await db.get('comments')
    return c.text(c.req.param('taskId'))
  })

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, jsonBody, async (c) => {
    if (db) await db.set('comment')
    return c.text(c.req.param('taskId'), 201)
  })

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', cookieAuth, async (c) => {
    if (db) await db.get('task')
    return c.text(c.req.param('taskId'))
  })

  app.get('/api/v1/organizations/settings/billing/payment-methods', cookieAuth, async (c) => {
    if (db) await db.get('methods')
    c.header('Cache-Control', 'private, no-cache')
    return c.text('methods')
  })

  const port = await new Promise((resolve) => {
    serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, (info) => resolve(info.port))
  })
  return { port }
}
