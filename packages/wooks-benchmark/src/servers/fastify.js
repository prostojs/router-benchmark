import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'

function requireHeaderAuth(request, reply) {
  if (request.headers.authorization !== `Bearer ${AUTH_TOKEN}`) {
    reply.status(401).send('Unauthorized')
    return false
  }
  return true
}

function requireCookieAuth(request, reply) {
  if (request.cookies.session !== SESSION_COOKIE) {
    reply.status(401).send('Unauthorized')
    return false
  }
  return true
}

export async function createServer() {
  const fastify = Fastify()

  await fastify.register(cookie)

  // --- Public routes ---

  fastify.get('/', (request, reply) => {
    reply.send('ok')
  })

  fastify.get('/health', (request, reply) => {
    reply.send('ok')
  })

  fastify.post('/auth/login', (request, reply) => {
    reply.header('Set-Cookie', `session=${SESSION_COOKIE}; Path=/; HttpOnly`)
    reply.status(201).send('token')
  })

  fastify.get('/static/*', (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    reply.send('file')
  })

  fastify.get('/api/v1/docs/*', (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600')
    reply.send('doc')
  })

  // --- Header-auth guarded routes ---

  fastify.get('/api/v1/users', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.send('users')
  })

  fastify.get('/api/v1/users/:userId', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.send(request.params.userId)
  })

  fastify.get('/api/v1/users/:userId/profile', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.send(request.params.userId)
  })

  fastify.get('/api/v1/projects', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.send('projects')
  })

  fastify.post('/api/v1/projects', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.status(201).send('created')
  })

  fastify.get('/api/v1/projects/:projectId', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.send(request.params.projectId)
  })

  fastify.delete('/api/v1/projects/:projectId', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.send(request.params.projectId)
  })

  fastify.get('/api/v1/organizations/settings/billing/invoices', (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    reply.header('Cache-Control', 'private, no-cache')
    reply.send('invoices')
  })

  // --- Cookie-auth guarded routes ---

  fastify.get('/api/v1/projects/:projectId/members', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.send(request.params.projectId)
  })

  fastify.get('/api/v1/projects/:projectId/tasks', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.send(request.params.projectId)
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.send(request.params.taskId)
  })

  fastify.put('/api/v1/projects/:projectId/tasks/:taskId', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.status(201).send(request.params.taskId)
  })

  fastify.delete('/api/v1/projects/:projectId/tasks/:taskId', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.send(request.params.taskId)
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId/comments', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.send(request.params.taskId)
  })

  fastify.post('/api/v1/projects/:projectId/tasks/:taskId/comments', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.status(201).send(request.params.taskId)
  })

  fastify.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.send(request.params.taskId)
  })

  fastify.get('/api/v1/organizations/settings/billing/payment-methods', (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    reply.header('Cache-Control', 'private, no-cache')
    reply.send('methods')
  })

  await fastify.listen({ port: 0 })
  return {
    server: fastify.server,
    close: () => fastify.close(),
  }
}
