import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { validator } from 'hono/validator'
import { serve } from '@hono/node-server'
import { createDb } from 'bench-utils/simulate-db'
import { BEARER, SESSION_COOKIE, isValidBody } from '../routes.js'

// Idiomatic Hono: per-route middleware for auth, placed before the built-in
// JSON validator so unauthorized requests are rejected without parsing the body.
async function headerAuth(c, next) {
  if (c.req.header('authorization') !== BEARER) return c.text('Unauthorized', 401)
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

  app.post('/auth/login', jsonBody, (c) => {
    setCookie(c, 'session', SESSION_COOKIE, { path: '/', httpOnly: true })
    return db ? db.set('session').then(() => c.text('token', 201)) : c.text('token', 201)
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

  app.get('/api/v1/users', headerAuth, (c) => {
    return db ? db.get('users').then(() => c.text('users')) : c.text('users')
  })

  app.get('/api/v1/users/:userId', headerAuth, (c) => {
    return db ? db.get('user').then(() => c.text(c.req.param('userId'))) : c.text(c.req.param('userId'))
  })

  app.get('/api/v1/users/:userId/profile', headerAuth, (c) => {
    return db ? db.get('profile').then(() => c.text(c.req.param('userId'))) : c.text(c.req.param('userId'))
  })

  app.get('/api/v1/projects', headerAuth, (c) => {
    return db ? db.get('projects').then(() => c.text('projects')) : c.text('projects')
  })

  app.post('/api/v1/projects', headerAuth, jsonBody, (c) => {
    return db ? db.set('project').then(() => c.text('created', 201)) : c.text('created', 201)
  })

  app.get('/api/v1/projects/:projectId', headerAuth, (c) => {
    return db ? db.get('project').then(() => c.text(c.req.param('projectId'))) : c.text(c.req.param('projectId'))
  })

  app.delete('/api/v1/projects/:projectId', headerAuth, (c) => {
    return db ? db.del('project').then(() => c.text(c.req.param('projectId'))) : c.text(c.req.param('projectId'))
  })

  app.get('/api/v1/organizations/settings/billing/invoices', headerAuth, (c) => {
    c.header('Cache-Control', 'private, no-cache')
    return db ? db.get('invoices').then(() => c.text('invoices')) : c.text('invoices')
  })

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', cookieAuth, (c) => {
    return db ? db.get('members').then(() => c.text(c.req.param('projectId'))) : c.text(c.req.param('projectId'))
  })

  app.get('/api/v1/projects/:projectId/tasks', cookieAuth, (c) => {
    return db ? db.get('tasks').then(() => c.text(c.req.param('projectId'))) : c.text(c.req.param('projectId'))
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, (c) => {
    return db ? db.get('task').then(() => c.text(c.req.param('taskId'))) : c.text(c.req.param('taskId'))
  })

  app.put('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, jsonBody, (c) => {
    return db ? db.set('task').then(() => c.text(c.req.param('taskId'), 201)) : c.text(c.req.param('taskId'), 201)
  })

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, (c) => {
    return db ? db.del('task').then(() => c.text(c.req.param('taskId'))) : c.text(c.req.param('taskId'))
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, (c) => {
    return db ? db.get('comments').then(() => c.text(c.req.param('taskId'))) : c.text(c.req.param('taskId'))
  })

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, jsonBody, (c) => {
    return db ? db.set('comment').then(() => c.text(c.req.param('taskId'), 201)) : c.text(c.req.param('taskId'), 201)
  })

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', cookieAuth, (c) => {
    return db ? db.get('task').then(() => c.text(c.req.param('taskId'))) : c.text(c.req.param('taskId'))
  })

  app.get('/api/v1/organizations/settings/billing/payment-methods', cookieAuth, (c) => {
    c.header('Cache-Control', 'private, no-cache')
    return db ? db.get('methods').then(() => c.text('methods')) : c.text('methods')
  })

  const server = await new Promise((resolve) => {
    const s = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, () => resolve(s))
  })
  return { server }
}
