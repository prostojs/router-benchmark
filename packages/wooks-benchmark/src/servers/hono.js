import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { serve } from '@hono/node-server'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'

function requireHeaderAuth(c) {
  if (c.req.header('authorization') !== `Bearer ${AUTH_TOKEN}`) {
    c.status(401)
    return false
  }
  return true
}

function requireCookieAuth(c) {
  if (getCookie(c, 'session') !== SESSION_COOKIE) {
    c.status(401)
    return false
  }
  return true
}

export function createServer() {
  return new Promise((resolve) => {
    const app = new Hono()

    // --- Public routes ---

    app.get('/', (c) => c.text('ok'))

    app.get('/health', (c) => c.text('ok'))

    app.post('/auth/login', async (c) => {
      await c.req.json()
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

    app.get('/api/v1/users', (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      return c.text('users')
    })

    app.get('/api/v1/users/:userId', (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('userId'))
    })

    app.get('/api/v1/users/:userId/profile', (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('userId'))
    })

    app.get('/api/v1/projects', (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      return c.text('projects')
    })

    app.post('/api/v1/projects', async (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      await c.req.json()
      return c.text('created', 201)
    })

    app.get('/api/v1/projects/:projectId', (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('projectId'))
    })

    app.delete('/api/v1/projects/:projectId', (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('projectId'))
    })

    app.get('/api/v1/organizations/settings/billing/invoices', (c) => {
      if (!requireHeaderAuth(c)) return c.text('Unauthorized')
      c.header('Cache-Control', 'private, no-cache')
      return c.text('invoices')
    })

    // --- Cookie-auth guarded routes ---

    app.get('/api/v1/projects/:projectId/members', (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('projectId'))
    })

    app.get('/api/v1/projects/:projectId/tasks', (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('projectId'))
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId', (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('taskId'))
    })

    app.put('/api/v1/projects/:projectId/tasks/:taskId', async (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      await c.req.json()
      return c.text(c.req.param('taskId'), 201)
    })

    app.delete('/api/v1/projects/:projectId/tasks/:taskId', (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('taskId'))
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('taskId'))
    })

    app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      await c.req.json()
      return c.text(c.req.param('taskId'), 201)
    })

    app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      return c.text(c.req.param('taskId'))
    })

    app.get('/api/v1/organizations/settings/billing/payment-methods', (c) => {
      if (!requireCookieAuth(c)) return c.text('Unauthorized')
      c.header('Cache-Control', 'private, no-cache')
      return c.text('methods')
    })

    const server = serve({ fetch: app.fetch, port: 0 }, (info) => {
      resolve({
        server: server,
        close: () => new Promise((r) => server.close(r)),
      })
    })
  })
}
