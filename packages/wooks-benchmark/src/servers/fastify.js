import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { createDb } from 'bench-utils/simulate-db'
import { BEARER, SESSION_COOKIE } from '../routes.js'

// Idiomatic Fastify: auth in an `onRequest` hook — it runs before the content-type
// parser, so unauthorized requests are rejected without parsing the body.
async function headerAuth(request, reply) {
  if (request.headers.authorization !== BEARER) {
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

  fastify.get('/', () => 'ok')

  fastify.get('/health', () => 'ok')

  fastify.post('/auth/login', objectBody, (request, reply) => {
    reply.setCookie('session', SESSION_COOKIE, { path: '/', httpOnly: true })
    reply.code(201)
    return db ? db.set('session').then(() => 'token') : 'token'
  })

  fastify.get('/static/*', (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    return 'file'
  })

  fastify.get('/api/v1/docs/*', (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600')
    return 'doc'
  })

  // --- Header-auth guarded routes ---

  fastify.get('/api/v1/users', headerGuard, () => {
    return db ? db.get('users').then(() => 'users') : 'users'
  })

  fastify.get('/api/v1/users/:userId', headerGuard, (request) => {
    return db ? db.get('user').then(() => request.params.userId) : request.params.userId
  })

  fastify.get('/api/v1/users/:userId/profile', headerGuard, (request) => {
    return db ? db.get('profile').then(() => request.params.userId) : request.params.userId
  })

  fastify.get('/api/v1/projects', headerGuard, () => {
    return db ? db.get('projects').then(() => 'projects') : 'projects'
  })

  fastify.post('/api/v1/projects', { ...headerGuard, ...objectBody }, (request, reply) => {
    reply.code(201)
    return db ? db.set('project').then(() => 'created') : 'created'
  })

  fastify.get('/api/v1/projects/:projectId', headerGuard, (request) => {
    return db ? db.get('project').then(() => request.params.projectId) : request.params.projectId
  })

  fastify.delete('/api/v1/projects/:projectId', headerGuard, (request) => {
    return db ? db.del('project').then(() => request.params.projectId) : request.params.projectId
  })

  fastify.get('/api/v1/organizations/settings/billing/invoices', headerGuard, (request, reply) => {
    reply.header('Cache-Control', 'private, no-cache')
    return db ? db.get('invoices').then(() => 'invoices') : 'invoices'
  })

  // --- Cookie-auth guarded routes ---

  fastify.get('/api/v1/projects/:projectId/members', cookieGuard, (request) => {
    return db ? db.get('members').then(() => request.params.projectId) : request.params.projectId
  })

  fastify.get('/api/v1/projects/:projectId/tasks', cookieGuard, (request) => {
    return db ? db.get('tasks').then(() => request.params.projectId) : request.params.projectId
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId', cookieGuard, (request) => {
    return db ? db.get('task').then(() => request.params.taskId) : request.params.taskId
  })

  fastify.put('/api/v1/projects/:projectId/tasks/:taskId', { ...cookieGuard, ...objectBody }, (request, reply) => {
    reply.code(201)
    return db ? db.set('task').then(() => request.params.taskId) : request.params.taskId
  })

  fastify.delete('/api/v1/projects/:projectId/tasks/:taskId', cookieGuard, (request) => {
    return db ? db.del('task').then(() => request.params.taskId) : request.params.taskId
  })

  fastify.get('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieGuard, (request) => {
    return db ? db.get('comments').then(() => request.params.taskId) : request.params.taskId
  })

  fastify.post('/api/v1/projects/:projectId/tasks/:taskId/comments', { ...cookieGuard, ...objectBody }, (request, reply) => {
    reply.code(201)
    return db ? db.set('comment').then(() => request.params.taskId) : request.params.taskId
  })

  fastify.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', cookieGuard, (request) => {
    return db ? db.get('task').then(() => request.params.taskId) : request.params.taskId
  })

  fastify.get('/api/v1/organizations/settings/billing/payment-methods', cookieGuard, (request, reply) => {
    reply.header('Cache-Control', 'private, no-cache')
    return db ? db.get('methods').then(() => 'methods') : 'methods'
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })
  return { server: fastify.server }
}
