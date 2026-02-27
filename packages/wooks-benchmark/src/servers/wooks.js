import { createHttpApp, useRouteParams, useHeaders, useResponse, useCookies, HttpError } from '@wooksjs/event-http'
import { useBody } from '@wooksjs/http-body'
import { createServer as createHttpServer } from 'node:http'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'
import { createDb } from '../simulate-db.js'

function requireHeaderAuth() {
  const headers = useHeaders()
  if (headers.authorization !== `Bearer ${AUTH_TOKEN}`) {
    throw new HttpError(401, 'Unauthorized')
  }
}

function requireCookieAuth() {
  const { getCookie } = useCookies()
  if (getCookie('session') !== SESSION_COOKIE) {
    throw new HttpError(401, 'Unauthorized')
  }
}

export function createServer({ simulateDb } = {}) {
  return new Promise((resolve) => {
    const db = simulateDb ? createDb() : null
    const app = createHttpApp()

    // --- Public routes ---

    app.get('/', () => 'ok')

    app.get('/health', () => 'ok')

    app.post('/auth/login', async () => {
      const { parseBody } = useBody()
      await parseBody()
      if (db) await db.set('session')
      const response = useResponse()
      response.setCookie('session', SESSION_COOKIE, { path: '/', httpOnly: true })
      return 'token'
    })

    app.get('/static/*', () => {
      const response = useResponse()
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      return 'file'
    })

    app.get('/api/v1/docs/*', () => {
      const response = useResponse()
      response.setHeader('Cache-Control', 'public, max-age=3600')
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
      const params = useRouteParams()
      return params.get('userId')
    })

    app.get('/api/v1/users/:userId/profile', async () => {
      requireHeaderAuth()
      if (db) await db.get('profile')
      const params = useRouteParams()
      return params.get('userId')
    })

    app.get('/api/v1/projects', async () => {
      requireHeaderAuth()
      if (db) await db.get('projects')
      return 'projects'
    })

    app.post('/api/v1/projects', async () => {
      requireHeaderAuth()
      const { parseBody } = useBody()
      await parseBody()
      if (db) await db.set('project')
      return 'created'
    })

    app.get('/api/v1/projects/:projectId', async () => {
      requireHeaderAuth()
      if (db) await db.get('project')
      const params = useRouteParams()
      return params.get('projectId')
    })

    app.delete('/api/v1/projects/:projectId', async () => {
      requireHeaderAuth()
      if (db) await db.del('project')
      const params = useRouteParams()
      return params.get('projectId')
    })

    app.get('/api/v1/organizations/settings/billing/invoices', async () => {
      requireHeaderAuth()
      if (db) await db.get('invoices')
      const response = useResponse()
      response.setHeader('Cache-Control', 'private, no-cache')
      return 'invoices'
    })

    // --- Cookie-auth guarded routes ---

    app.get('/api/v1/projects/:projectId/members', async () => {
      requireCookieAuth()
      if (db) await db.get('members')
      const params = useRouteParams()
      return params.get('projectId')
    })

    app.get('/api/v1/projects/:projectId/tasks', async () => {
      requireCookieAuth()
      if (db) await db.get('tasks')
      const params = useRouteParams()
      return params.get('projectId')
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId', async () => {
      requireCookieAuth()
      if (db) await db.get('task')
      const params = useRouteParams()
      return params.get('taskId')
    })

    app.put('/api/v1/projects/:projectId/tasks/:taskId', async () => {
      requireCookieAuth()
      const { parseBody } = useBody()
      await parseBody()
      if (db) await db.set('task')
      const params = useRouteParams()
      return params.get('taskId')
    })

    app.delete('/api/v1/projects/:projectId/tasks/:taskId', async () => {
      requireCookieAuth()
      if (db) await db.del('task')
      const params = useRouteParams()
      return params.get('taskId')
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', async () => {
      requireCookieAuth()
      if (db) await db.get('comments')
      const params = useRouteParams()
      return params.get('taskId')
    })

    app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async () => {
      requireCookieAuth()
      const { parseBody } = useBody()
      await parseBody()
      if (db) await db.set('comment')
      const params = useRouteParams()
      return params.get('taskId')
    })

    app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', async () => {
      requireCookieAuth()
      if (db) await db.get('task')
      const params = useRouteParams()
      return params.get('taskId')
    })

    app.get('/api/v1/organizations/settings/billing/payment-methods', async () => {
      requireCookieAuth()
      if (db) await db.get('methods')
      const response = useResponse()
      response.setHeader('Cache-Control', 'private, no-cache')
      return 'methods'
    })

    const server = createHttpServer(app.getServerCb())
    server.listen(0, () => {
      resolve({
        server,
        close: async () => {
          if (db) db.close()
          return new Promise((r) => server.close(r))
        },
      })
    })
  })
}
