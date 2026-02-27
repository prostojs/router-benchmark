import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'
import { createDb } from '../simulate-db.js'

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

export async function createServer({ simulateDb } = {}) {
  const db = simulateDb ? createDb() : null
  const fastify = Fastify()

  await fastify.register(cookie)

  // --- Public routes ---

  fastify.get('/', (request, reply) => {
    reply.send('ok')
  })

  fastify.get('/health', (request, reply) => {
    reply.send('ok')
  })

  fastify.post('/auth/login', async (request, reply) => {
    if (db) await db.set('session')
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

  fastify.get('/api/v1/users', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.get('users')
    reply.send('users')
  })

  fastify.get('/api/v1/users/:userId', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.get('user')
    reply.send(request.params.userId)
  })

  fastify.get('/api/v1/users/:userId/profile', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.get('profile')
    reply.send(request.params.userId)
  })

  fastify.get('/api/v1/projects', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.get('projects')
    reply.send('projects')
  })

  fastify.post('/api/v1/projects', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.set('project')
    reply.status(201).send('created')
  })

  fastify.get('/api/v1/projects/:projectId', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.get('project')
    reply.send(request.params.projectId)
  })

  fastify.delete('/api/v1/projects/:projectId', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.del('project')
    reply.send(request.params.projectId)
  })

  fastify.get('/api/v1/organizations/settings/billing/invoices', async (request, reply) => {
    if (!requireHeaderAuth(request, reply)) return
    if (db) await db.get('invoices')
    reply.header('Cache-Control', 'private, no-cache')
    reply.send('invoices')
  })

  // --- Cookie-auth guarded routes ---

  fastify.get('/api/v1/projects/:projectId/members', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.get('members')
    reply.send(request.params.projectId)
  })

  fastify.get('/api/v1/projects/:projectId/tasks', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.get('tasks')
    reply.send(request.params.projectId)
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.get('task')
    reply.send(request.params.taskId)
  })

  fastify.put('/api/v1/projects/:projectId/tasks/:taskId', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.set('task')
    reply.status(201).send(request.params.taskId)
  })

  fastify.delete('/api/v1/projects/:projectId/tasks/:taskId', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.del('task')
    reply.send(request.params.taskId)
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId/comments', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.get('comments')
    reply.send(request.params.taskId)
  })

  fastify.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.set('comment')
    reply.status(201).send(request.params.taskId)
  })

  fastify.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.get('task')
    reply.send(request.params.taskId)
  })

  fastify.get('/api/v1/organizations/settings/billing/payment-methods', async (request, reply) => {
    if (!requireCookieAuth(request, reply)) return
    if (db) await db.get('methods')
    reply.header('Cache-Control', 'private, no-cache')
    reply.send('methods')
  })

  await fastify.listen({ port: 0 })
  return {
    server: fastify.server,
    close: async () => {
      if (db) db.close()
      return fastify.close()
    },
  }
}
