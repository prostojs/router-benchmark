import express from 'express'
import cookieParser from 'cookie-parser'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'

function requireHeaderAuth(req, res) {
  if (req.headers.authorization !== `Bearer ${AUTH_TOKEN}`) {
    res.status(401).send('Unauthorized')
    return false
  }
  return true
}

function requireCookieAuth(req, res) {
  if (req.cookies.session !== SESSION_COOKIE) {
    res.status(401).send('Unauthorized')
    return false
  }
  return true
}

export function createServer() {
  return new Promise((resolve) => {
    const app = express()

    app.use(express.json())
    app.use(cookieParser())

    // --- Public routes ---

    app.get('/', (req, res) => {
      res.send('ok')
    })

    app.get('/health', (req, res) => {
      res.send('ok')
    })

    app.post('/auth/login', (req, res) => {
      res.setHeader('Set-Cookie', `session=${SESSION_COOKIE}; Path=/; HttpOnly`)
      res.status(201).send('token')
    })

    // Express 5 requires named wildcards
    app.get('/static/*path', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.send('file')
    })

    app.get('/api/v1/docs/*path', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.send('doc')
    })

    // --- Header-auth guarded routes ---

    app.get('/api/v1/users', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.send('users')
    })

    app.get('/api/v1/users/:userId', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.send(req.params.userId)
    })

    app.get('/api/v1/users/:userId/profile', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.send(req.params.userId)
    })

    app.get('/api/v1/projects', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.send('projects')
    })

    app.post('/api/v1/projects', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.status(201).send('created')
    })

    app.get('/api/v1/projects/:projectId', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.send(req.params.projectId)
    })

    app.delete('/api/v1/projects/:projectId', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.send(req.params.projectId)
    })

    app.get('/api/v1/organizations/settings/billing/invoices', (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      res.setHeader('Cache-Control', 'private, no-cache')
      res.send('invoices')
    })

    // --- Cookie-auth guarded routes ---

    app.get('/api/v1/projects/:projectId/members', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.send(req.params.projectId)
    })

    app.get('/api/v1/projects/:projectId/tasks', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.send(req.params.projectId)
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.send(req.params.taskId)
    })

    app.put('/api/v1/projects/:projectId/tasks/:taskId', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.status(201).send(req.params.taskId)
    })

    app.delete('/api/v1/projects/:projectId/tasks/:taskId', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.send(req.params.taskId)
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.send(req.params.taskId)
    })

    app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.status(201).send(req.params.taskId)
    })

    app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.send(req.params.taskId)
    })

    app.get('/api/v1/organizations/settings/billing/payment-methods', (req, res) => {
      if (!requireCookieAuth(req, res)) return
      res.setHeader('Cache-Control', 'private, no-cache')
      res.send('methods')
    })

    const server = app.listen(0, () => {
      resolve({ server, close: () => new Promise((r) => server.close(r)) })
    })
  })
}
