import express from 'express'
import cookieParser from 'cookie-parser'
import { AUTH_TOKEN, SESSION_COOKIE, isValidBody } from '../routes.js'
import { createDb } from '../simulate-db.js'

// Idiomatic Express: route-level middleware chains. Auth middleware is placed
// before the JSON body parser so unauthorized requests are rejected unparsed.
function headerAuth(req, res, next) {
  if (req.headers.authorization !== `Bearer ${AUTH_TOKEN}`) return res.status(401).send('Unauthorized')
  next()
}

function cookieAuth(req, res, next) {
  if (req.cookies.session !== SESSION_COOKIE) return res.status(401).send('Unauthorized')
  next()
}

const json = express.json()

function validBody(req, res, next) {
  if (!isValidBody(req.body)) return res.status(400).send('Invalid body')
  next()
}

export async function createServer({ simulateDb } = {}) {
  const db = simulateDb ? createDb() : null
  const app = express()
  app.disable('x-powered-by')
  app.use(cookieParser())

  // --- Public routes ---

  app.get('/', (req, res) => { res.send('ok') })

  app.get('/health', (req, res) => { res.send('ok') })

  app.post('/auth/login', json, validBody, async (req, res) => {
    if (db) await db.set('session')
    res.cookie('session', SESSION_COOKIE, { path: '/', httpOnly: true })
    res.status(201).send('token')
  })

  // Express 5 requires named wildcards
  app.get('/static/*path', (req, res) => {
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.send('file')
  })

  app.get('/api/v1/docs/*path', (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600')
    res.send('doc')
  })

  // --- Header-auth guarded routes ---

  app.get('/api/v1/users', headerAuth, async (req, res) => {
    if (db) await db.get('users')
    res.send('users')
  })

  app.get('/api/v1/users/:userId', headerAuth, async (req, res) => {
    if (db) await db.get('user')
    res.send(req.params.userId)
  })

  app.get('/api/v1/users/:userId/profile', headerAuth, async (req, res) => {
    if (db) await db.get('profile')
    res.send(req.params.userId)
  })

  app.get('/api/v1/projects', headerAuth, async (req, res) => {
    if (db) await db.get('projects')
    res.send('projects')
  })

  app.post('/api/v1/projects', headerAuth, json, validBody, async (req, res) => {
    if (db) await db.set('project')
    res.status(201).send('created')
  })

  app.get('/api/v1/projects/:projectId', headerAuth, async (req, res) => {
    if (db) await db.get('project')
    res.send(req.params.projectId)
  })

  app.delete('/api/v1/projects/:projectId', headerAuth, async (req, res) => {
    if (db) await db.del('project')
    res.send(req.params.projectId)
  })

  app.get('/api/v1/organizations/settings/billing/invoices', headerAuth, async (req, res) => {
    if (db) await db.get('invoices')
    res.set('Cache-Control', 'private, no-cache')
    res.send('invoices')
  })

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', cookieAuth, async (req, res) => {
    if (db) await db.get('members')
    res.send(req.params.projectId)
  })

  app.get('/api/v1/projects/:projectId/tasks', cookieAuth, async (req, res) => {
    if (db) await db.get('tasks')
    res.send(req.params.projectId)
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, async (req, res) => {
    if (db) await db.get('task')
    res.send(req.params.taskId)
  })

  app.put('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, json, validBody, async (req, res) => {
    if (db) await db.set('task')
    res.status(201).send(req.params.taskId)
  })

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, async (req, res) => {
    if (db) await db.del('task')
    res.send(req.params.taskId)
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, async (req, res) => {
    if (db) await db.get('comments')
    res.send(req.params.taskId)
  })

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, json, validBody, async (req, res) => {
    if (db) await db.set('comment')
    res.status(201).send(req.params.taskId)
  })

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', cookieAuth, async (req, res) => {
    if (db) await db.get('task')
    res.send(req.params.taskId)
  })

  app.get('/api/v1/organizations/settings/billing/payment-methods', cookieAuth, async (req, res) => {
    if (db) await db.get('methods')
    res.set('Cache-Control', 'private, no-cache')
    res.send('methods')
  })

  // No stack traces / HTML error pages in production; plain status responses.
  app.use((err, req, res, next) => {
    res.status(err.status || err.statusCode || 500).send(err.expose ? err.message : 'Error')
  })

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  return { port: server.address().port }
}
