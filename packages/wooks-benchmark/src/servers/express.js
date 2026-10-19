import express from 'express'
import cookieParser from 'cookie-parser'
import { createDb } from 'bench-utils/simulate-db'
import { BEARER, SESSION_COOKIE, isValidBody } from '../routes.js'

// Idiomatic Express: route-level middleware chains. Auth middleware is placed
// before the JSON body parser so unauthorized requests are rejected unparsed.
function headerAuth(req, res, next) {
  if (req.headers.authorization !== BEARER) return res.status(401).send('Unauthorized')
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

  app.post('/auth/login', json, validBody, (req, res) => {
    res.cookie('session', SESSION_COOKIE, { path: '/', httpOnly: true })
    return db ? db.set('session').then(() => res.status(201).send('token')) : res.status(201).send('token')
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

  app.get('/api/v1/users', headerAuth, (req, res) => {
    return db ? db.get('users').then(() => res.send('users')) : res.send('users')
  })

  app.get('/api/v1/users/:userId', headerAuth, (req, res) => {
    return db ? db.get('user').then(() => res.send(req.params.userId)) : res.send(req.params.userId)
  })

  app.get('/api/v1/users/:userId/profile', headerAuth, (req, res) => {
    return db ? db.get('profile').then(() => res.send(req.params.userId)) : res.send(req.params.userId)
  })

  app.get('/api/v1/projects', headerAuth, (req, res) => {
    return db ? db.get('projects').then(() => res.send('projects')) : res.send('projects')
  })

  app.post('/api/v1/projects', headerAuth, json, validBody, (req, res) => {
    return db ? db.set('project').then(() => res.status(201).send('created')) : res.status(201).send('created')
  })

  app.get('/api/v1/projects/:projectId', headerAuth, (req, res) => {
    return db ? db.get('project').then(() => res.send(req.params.projectId)) : res.send(req.params.projectId)
  })

  app.delete('/api/v1/projects/:projectId', headerAuth, (req, res) => {
    return db ? db.del('project').then(() => res.send(req.params.projectId)) : res.send(req.params.projectId)
  })

  app.get('/api/v1/organizations/settings/billing/invoices', headerAuth, (req, res) => {
    res.set('Cache-Control', 'private, no-cache')
    return db ? db.get('invoices').then(() => res.send('invoices')) : res.send('invoices')
  })

  // --- Cookie-auth guarded routes ---

  app.get('/api/v1/projects/:projectId/members', cookieAuth, (req, res) => {
    return db ? db.get('members').then(() => res.send(req.params.projectId)) : res.send(req.params.projectId)
  })

  app.get('/api/v1/projects/:projectId/tasks', cookieAuth, (req, res) => {
    return db ? db.get('tasks').then(() => res.send(req.params.projectId)) : res.send(req.params.projectId)
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, (req, res) => {
    return db ? db.get('task').then(() => res.send(req.params.taskId)) : res.send(req.params.taskId)
  })

  app.put('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, json, validBody, (req, res) => {
    return db ? db.set('task').then(() => res.status(201).send(req.params.taskId)) : res.status(201).send(req.params.taskId)
  })

  app.delete('/api/v1/projects/:projectId/tasks/:taskId', cookieAuth, (req, res) => {
    return db ? db.del('task').then(() => res.send(req.params.taskId)) : res.send(req.params.taskId)
  })

  app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, (req, res) => {
    return db ? db.get('comments').then(() => res.send(req.params.taskId)) : res.send(req.params.taskId)
  })

  app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', cookieAuth, json, validBody, (req, res) => {
    return db ? db.set('comment').then(() => res.status(201).send(req.params.taskId)) : res.status(201).send(req.params.taskId)
  })

  app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', cookieAuth, (req, res) => {
    return db ? db.get('task').then(() => res.send(req.params.taskId)) : res.send(req.params.taskId)
  })

  app.get('/api/v1/organizations/settings/billing/payment-methods', cookieAuth, (req, res) => {
    res.set('Cache-Control', 'private, no-cache')
    return db ? db.get('methods').then(() => res.send('methods')) : res.send('methods')
  })

  // No stack traces / HTML error pages in production; plain status responses.
  app.use((err, req, res, next) => {
    res.status(err.status || err.statusCode || 500).send(err.expose ? err.message : 'Error')
  })

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  return { server }
}
