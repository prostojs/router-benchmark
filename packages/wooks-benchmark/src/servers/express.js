import express from 'express'
import cookieParser from 'cookie-parser'
import { AUTH_TOKEN, SESSION_COOKIE } from '../routes.js'
import { createDb } from '../simulate-db.js'

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

export function createServer({ simulateDb } = {}) {
  return new Promise((resolve) => {
    const db = simulateDb ? createDb() : null
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

    app.post('/auth/login', async (req, res) => {
      if (db) await db.set('session')
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

    app.get('/api/v1/users', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.get('users')
      res.send('users')
    })

    app.get('/api/v1/users/:userId', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.get('user')
      res.send(req.params.userId)
    })

    app.get('/api/v1/users/:userId/profile', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.get('profile')
      res.send(req.params.userId)
    })

    app.get('/api/v1/projects', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.get('projects')
      res.send('projects')
    })

    app.post('/api/v1/projects', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.set('project')
      res.status(201).send('created')
    })

    app.get('/api/v1/projects/:projectId', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.get('project')
      res.send(req.params.projectId)
    })

    app.delete('/api/v1/projects/:projectId', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.del('project')
      res.send(req.params.projectId)
    })

    app.get('/api/v1/organizations/settings/billing/invoices', async (req, res) => {
      if (!requireHeaderAuth(req, res)) return
      if (db) await db.get('invoices')
      res.setHeader('Cache-Control', 'private, no-cache')
      res.send('invoices')
    })

    // --- Cookie-auth guarded routes ---

    app.get('/api/v1/projects/:projectId/members', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.get('members')
      res.send(req.params.projectId)
    })

    app.get('/api/v1/projects/:projectId/tasks', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.get('tasks')
      res.send(req.params.projectId)
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.get('task')
      res.send(req.params.taskId)
    })

    app.put('/api/v1/projects/:projectId/tasks/:taskId', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.set('task')
      res.status(201).send(req.params.taskId)
    })

    app.delete('/api/v1/projects/:projectId/tasks/:taskId', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.del('task')
      res.send(req.params.taskId)
    })

    app.get('/api/v1/projects/:projectId/tasks/:taskId/comments', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.get('comments')
      res.send(req.params.taskId)
    })

    app.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.set('comment')
      res.status(201).send(req.params.taskId)
    })

    app.get('/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.get('task')
      res.send(req.params.taskId)
    })

    app.get('/api/v1/organizations/settings/billing/payment-methods', async (req, res) => {
      if (!requireCookieAuth(req, res)) return
      if (db) await db.get('methods')
      res.setHeader('Cache-Control', 'private, no-cache')
      res.send('methods')
    })

    const server = app.listen(0, () => {
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
