export const routes = [
  // Public (no auth)
  { method: 'GET',  url: '/' },
  { method: 'GET',  url: '/health' },
  { method: 'POST', url: '/auth/login' },
  { method: 'GET',  url: '/static/*' },
  { method: 'GET',  url: '/api/v1/docs/*' },

  // Header-auth guarded
  { method: 'GET',    url: '/api/v1/users' },
  { method: 'GET',    url: '/api/v1/users/:userId' },
  { method: 'GET',    url: '/api/v1/users/:userId/profile' },
  { method: 'GET',    url: '/api/v1/projects' },
  { method: 'POST',   url: '/api/v1/projects' },
  { method: 'GET',    url: '/api/v1/projects/:projectId' },
  { method: 'DELETE', url: '/api/v1/projects/:projectId' },
  { method: 'GET',    url: '/api/v1/account/settings/billing/invoices' },

  // Cookie-auth guarded
  { method: 'GET',    url: '/api/v1/projects/:projectId/members' },
  { method: 'GET',    url: '/api/v1/projects/:projectId/tasks' },
  { method: 'GET',    url: '/api/v1/projects/:projectId/tasks/:taskId' },
  { method: 'PUT',    url: '/api/v1/projects/:projectId/tasks/:taskId' },
  { method: 'DELETE', url: '/api/v1/projects/:projectId/tasks/:taskId' },
  { method: 'GET',    url: '/api/v1/projects/:projectId/tasks/:taskId/comments' },
  { method: 'POST',   url: '/api/v1/projects/:projectId/tasks/:taskId/comments' },
  { method: 'GET',    url: '/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId' },
  { method: 'GET',    url: '/api/v1/account/settings/billing/payment-methods' },
]
