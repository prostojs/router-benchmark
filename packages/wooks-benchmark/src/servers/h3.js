import { createApp, createRouter, defineEventHandler, getRouterParams, getHeader, setResponseHeader, setResponseStatus, toNodeListener, readBody, parseCookies } from 'h3'
import { createServer as createHttpServer } from 'node:http'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'

function requireHeaderAuth(event) {
  const auth = getHeader(event, 'authorization')
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    setResponseStatus(event, 401)
    return false
  }
  return true
}

function requireCookieAuth(event) {
  const cookies = parseCookies(event)
  if (cookies.session !== SESSION_COOKIE) {
    setResponseStatus(event, 401)
    return false
  }
  return true
}

export function createServer() {
  return new Promise((resolve) => {
    const app = createApp()
    const router = createRouter()

    // --- Public routes ---

    router.get('/', defineEventHandler(() => 'ok'))

    router.get('/health', defineEventHandler(() => 'ok'))

    router.post('/auth/login', defineEventHandler(async (event) => {
      await readBody(event)
      setResponseHeader(event, 'Set-Cookie', `session=${SESSION_COOKIE}; Path=/; HttpOnly`)
      setResponseStatus(event, 201)
      return 'token'
    }))

    // h3 uses /** for wildcard catch-all
    router.get('/static/**', defineEventHandler((event) => {
      setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
      return 'file'
    }))

    router.get('/api/v1/docs/**', defineEventHandler((event) => {
      setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
      return 'doc'
    }))

    // --- Header-auth guarded routes ---

    router.get('/api/v1/users', defineEventHandler((event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      return 'users'
    }))

    router.get('/api/v1/users/:userId', defineEventHandler((event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      const { userId } = getRouterParams(event)
      return userId
    }))

    router.get('/api/v1/users/:userId/profile', defineEventHandler((event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      const { userId } = getRouterParams(event)
      return userId
    }))

    router.get('/api/v1/projects', defineEventHandler((event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      return 'projects'
    }))

    router.post('/api/v1/projects', defineEventHandler(async (event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      await readBody(event)
      setResponseStatus(event, 201)
      return 'created'
    }))

    router.get('/api/v1/projects/:projectId', defineEventHandler((event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      const { projectId } = getRouterParams(event)
      return projectId
    }))

    router.delete('/api/v1/projects/:projectId', defineEventHandler((event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      const { projectId } = getRouterParams(event)
      return projectId
    }))

    router.get('/api/v1/organizations/settings/billing/invoices', defineEventHandler((event) => {
      if (!requireHeaderAuth(event)) return 'Unauthorized'
      setResponseHeader(event, 'Cache-Control', 'private, no-cache')
      return 'invoices'
    }))

    // --- Cookie-auth guarded routes ---

    router.get('/api/v1/projects/:projectId/members', defineEventHandler((event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      const { projectId } = getRouterParams(event)
      return projectId
    }))

    router.get('/api/v1/projects/:projectId/tasks', defineEventHandler((event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      const { projectId } = getRouterParams(event)
      return projectId
    }))

    router.get('/api/v1/projects/:projectId/tasks/:taskId', defineEventHandler((event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      const { taskId } = getRouterParams(event)
      return taskId
    }))

    router.put('/api/v1/projects/:projectId/tasks/:taskId', defineEventHandler(async (event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      await readBody(event)
      setResponseStatus(event, 201)
      const { taskId } = getRouterParams(event)
      return taskId
    }))

    router.delete('/api/v1/projects/:projectId/tasks/:taskId', defineEventHandler((event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      const { taskId } = getRouterParams(event)
      return taskId
    }))

    router.get('/api/v1/projects/:projectId/tasks/:taskId/comments', defineEventHandler((event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      const { taskId } = getRouterParams(event)
      return taskId
    }))

    router.post('/api/v1/projects/:projectId/tasks/:taskId/comments', defineEventHandler(async (event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      await readBody(event)
      setResponseStatus(event, 201)
      const { taskId } = getRouterParams(event)
      return taskId
    }))

    router.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', defineEventHandler((event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      const { taskId } = getRouterParams(event)
      return taskId
    }))

    router.get('/api/v1/organizations/settings/billing/payment-methods', defineEventHandler((event) => {
      if (!requireCookieAuth(event)) return 'Unauthorized'
      setResponseHeader(event, 'Cache-Control', 'private, no-cache')
      return 'methods'
    }))

    app.use(router)
    const server = createHttpServer(toNodeListener(app))
    server.listen(0, () => {
      resolve({ server, close: () => new Promise((r) => server.close(r)) })
    })
  })
}
