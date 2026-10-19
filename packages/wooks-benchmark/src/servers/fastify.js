import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'
import { createDb } from '../simulate-db.js'

// Idiomatic Fastify: auth in an `onRequest` hook — it runs before the content-type
// parser, so unauthorized requests are rejected without parsing the body.
async function headerAuth(request, reply) {
  if (request.headers.authorization !== `Bearer ${AUTH_TOKEN}`) {
    return reply.code(401).send('Unauthorized')
  }
}

async function cookieAuth(request, reply) {
  if (request.cookies.session !== SESSION_COOKIE) {
    return reply.code(401).send('Unauthorized')
  }
}

// Idiomatic Fastify body validation: a JSON schema (compiled once by ajv).
const objectBody = { schema: { body: { type: 'object' } } }

const headerGuard = { onRequest: headerAuth }
const cookieGuard = { onRequest: cookieAuth }

export async function createServer({ simulateDb } = {}) {
  const db = simulateDb ? createDb() : null
  const fastify = Fastify({ logger: false })

  await fastify.register(cookie)

  // --- Public routes ---

  fastify.get('/', async () => 'ok')

  fastify.get('/health', async () => 'ok')

  fastify.post('/auth/login', objectBody, async (request, reply) => {
    if (db) await db.set('session')
    reply.setCookie('session', SESSION_COOKIE, { path: '/', httpOnly: true })
    reply.code(201)
    return 'token'
  })

  fastify.get('/static/*', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    return 'file'
  })

  fastify.get('/api/v1/docs/*', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600')
    return 'doc'
  })

  // --- Header-auth guarded routes ---

  fastify.get('/api/v1/users', headerGuard, async () => {
    if (db) await db.get('users')
    return 'users'
  })

  fastify.get('/api/v1/users/:userId', headerGuard, async (request) => {
    if (db) await db.get('user')
    return request.params.userId
  })

  fastify.get('/api/v1/users/:userId/profile', headerGuard, async (request) => {
    if (db) await db.get('profile')
    return request.params.userId
  })

  fastify.get('/api/v1/projects', headerGuard, async () => {
    if (db) await db.get('projects')
    return 'projects'
  })

  fastify.post('/api/v1/projects', { ...headerGuard, ...objectBody }, async (request, reply) => {
    if (db) await db.set('project')
    reply.code(201)
    return 'created'
  })

  fastify.get('/api/v1/projects/:projectId', headerGuard, async (request) => {
    if (db) await db.get('project')
    return request.params.projectId
  })

  fastify.delete('/api/v1/projects/:projectId', headerGuard, async (request) => {
    if (db) await db.del('project')
    return request.params.projectId
  })

  fastify.get('/api/v1/organizations/settings/billing/invoices', headerGuard, async (request, reply) => {
    if (db) await db.get('invoices')
    reply.header('Cache-Control', 'private, no-cache')
    return 'invoices'
  })

  // --- Cookie-auth guarded routes ---

  fastify.get('/api/v1/projects/:projectId/members', cookieGuard, async (request) => {
    if (db) await db.get('members')
    return request.params.projectId
  })

  fastify.get('/api/v1/projects/:projectId/tasks', cookieGuard, async (request) => {
    if (db) await db.get('tasks')
    return request.params.projectId
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId', cookieGuard, async (request) => {
    if (db) await db.get('task')
    return request.params.taskId
  })

  fastify.put('/api/v1/projects/:projectId/tasks/:taskId', { ...cookieGuard, ...objectBody }, async (request, reply) => {
    if (db) await db.set('task')
    reply.code(201)
    return request.params.taskId
  })

  fastify.delete('/api/v1/projects/:projectId/tasks/:taskId', cookieGuard, async (request) => {
    if (db) await db.del('task')
    return request.params.taskId
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieGuard, async (request) => {
    if (db) await db.get('comments')
    return request.params.taskId
  })

  fastify.post('/api/v1/projects/:projectId/tasks/:taskId/comments', { ...cookieGuard, ...objectBody }, async (request, reply) => {
    if (db) await db.set('comment')
    reply.code(201)
    return request.params.taskId
  })

  fastify.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', cookieGuard, async (request) => {
    if (db) await db.get('task')
    return request.params.taskId
  })

  fastify.get('/api/v1/organizations/settings/billing/payment-methods', cookieGuard, async (request, reply) => {
    if (db) await db.get('methods')
    reply.header('Cache-Control', 'private, no-cache')
    return 'methods'
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })
  return { port: fastify.server.address().port }
}
