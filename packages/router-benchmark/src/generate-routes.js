// Generates realistic enterprise SaaS route sets (think GitHub, Jira, Slack APIs).
// Routes are produced in interleaved domain modules so that even small counts
// contain a good mix of static, parametric, and deeply nested routes.

// Each domain module defines a set of routes at increasing depth.
// Routes are interleaved across modules to ensure even distribution at any target count.
const domainModules = [
  // --- Organization & Workspace management ---
  { routes: [
    ['GET',    '/api/v1/organizations'],
    ['POST',   '/api/v1/organizations'],
    ['GET',    '/api/v1/organizations/:orgId'],
    ['PATCH',  '/api/v1/organizations/:orgId'],
    ['DELETE', '/api/v1/organizations/:orgId'],
    ['GET',    '/api/v1/organizations/:orgId/settings/general'],
    ['PUT',    '/api/v1/organizations/:orgId/settings/general'],
    ['GET',    '/api/v1/organizations/:orgId/settings/billing/subscription'],
    ['GET',    '/api/v1/organizations/:orgId/settings/billing/invoices'],
    ['GET',    '/api/v1/organizations/:orgId/settings/billing/invoices/:invoiceId'],
    ['GET',    '/api/v1/organizations/:orgId/settings/billing/payment-methods'],
    ['POST',   '/api/v1/organizations/:orgId/settings/billing/payment-methods'],
    ['GET',    '/api/v1/organizations/:orgId/settings/security/audit-log'],
    ['GET',    '/api/v1/organizations/:orgId/settings/security/sso-config'],
    ['PUT',    '/api/v1/organizations/:orgId/settings/security/sso-config'],
  ]},
  // --- Workspace & Members ---
  { routes: [
    ['GET',    '/api/v1/organizations/:orgId/workspaces'],
    ['POST',   '/api/v1/organizations/:orgId/workspaces'],
    ['GET',    '/api/v1/organizations/:orgId/workspaces/:workspaceId'],
    ['PATCH',  '/api/v1/organizations/:orgId/workspaces/:workspaceId'],
    ['DELETE', '/api/v1/organizations/:orgId/workspaces/:workspaceId'],
    ['GET',    '/api/v1/organizations/:orgId/workspaces/:workspaceId/members'],
    ['POST',   '/api/v1/organizations/:orgId/workspaces/:workspaceId/members'],
    ['GET',    '/api/v1/organizations/:orgId/workspaces/:workspaceId/members/:memberId'],
    ['PUT',    '/api/v1/organizations/:orgId/workspaces/:workspaceId/members/:memberId/role'],
    ['DELETE', '/api/v1/organizations/:orgId/workspaces/:workspaceId/members/:memberId'],
    ['GET',    '/api/v1/organizations/:orgId/workspaces/:workspaceId/activity-feed'],
    ['GET',    '/api/v1/organizations/:orgId/workspaces/:workspaceId/analytics/overview'],
    ['GET',    '/api/v1/organizations/:orgId/workspaces/:workspaceId/analytics/usage-report'],
  ]},
  // --- Projects ---
  { routes: [
    ['GET',    '/api/v1/workspaces/:workspaceId/projects'],
    ['POST',   '/api/v1/workspaces/:workspaceId/projects'],
    ['GET',    '/api/v1/workspaces/:workspaceId/projects/:projectId'],
    ['PATCH',  '/api/v1/workspaces/:workspaceId/projects/:projectId'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/projects/:projectId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/projects/:projectId/settings'],
    ['PUT',    '/api/v1/workspaces/:workspaceId/projects/:projectId/settings'],
    ['GET',    '/api/v1/workspaces/:workspaceId/projects/:projectId/members'],
    ['POST',   '/api/v1/workspaces/:workspaceId/projects/:projectId/members/invite'],
    ['GET',    '/api/v1/workspaces/:workspaceId/projects/:projectId/activity-log'],
    ['POST',   '/api/v1/workspaces/:workspaceId/projects/:projectId/archive'],
    ['POST',   '/api/v1/workspaces/:workspaceId/projects/:projectId/restore'],
  ]},
  // --- Issues / Tasks ---
  { routes: [
    ['GET',    '/api/v1/projects/:projectId/issues'],
    ['POST',   '/api/v1/projects/:projectId/issues'],
    ['GET',    '/api/v1/projects/:projectId/issues/:issueId'],
    ['PATCH',  '/api/v1/projects/:projectId/issues/:issueId'],
    ['DELETE', '/api/v1/projects/:projectId/issues/:issueId'],
    ['GET',    '/api/v1/projects/:projectId/issues/:issueId/comments'],
    ['POST',   '/api/v1/projects/:projectId/issues/:issueId/comments'],
    ['PATCH',  '/api/v1/projects/:projectId/issues/:issueId/comments/:commentId'],
    ['DELETE', '/api/v1/projects/:projectId/issues/:issueId/comments/:commentId'],
    ['GET',    '/api/v1/projects/:projectId/issues/:issueId/attachments'],
    ['POST',   '/api/v1/projects/:projectId/issues/:issueId/attachments'],
    ['GET',    '/api/v1/projects/:projectId/issues/:issueId/history'],
    ['POST',   '/api/v1/projects/:projectId/issues/:issueId/transitions/:transitionId'],
    ['GET',    '/api/v1/projects/:projectId/issues/:issueId/linked-issues'],
    ['POST',   '/api/v1/projects/:projectId/issues/:issueId/linked-issues'],
  ]},
  // --- Boards & Sprints ---
  { routes: [
    ['GET',    '/api/v1/projects/:projectId/boards'],
    ['POST',   '/api/v1/projects/:projectId/boards'],
    ['GET',    '/api/v1/projects/:projectId/boards/:boardId'],
    ['PUT',    '/api/v1/projects/:projectId/boards/:boardId'],
    ['DELETE', '/api/v1/projects/:projectId/boards/:boardId'],
    ['GET',    '/api/v1/projects/:projectId/boards/:boardId/columns'],
    ['POST',   '/api/v1/projects/:projectId/boards/:boardId/columns'],
    ['PUT',    '/api/v1/projects/:projectId/boards/:boardId/columns/:columnId'],
    ['DELETE', '/api/v1/projects/:projectId/boards/:boardId/columns/:columnId'],
    ['POST',   '/api/v1/projects/:projectId/boards/:boardId/columns/:columnId/move'],
    ['GET',    '/api/v1/projects/:projectId/sprints'],
    ['POST',   '/api/v1/projects/:projectId/sprints'],
    ['GET',    '/api/v1/projects/:projectId/sprints/:sprintId'],
    ['PUT',    '/api/v1/projects/:projectId/sprints/:sprintId'],
    ['POST',   '/api/v1/projects/:projectId/sprints/:sprintId/complete'],
  ]},
  // --- Teams & Roles ---
  { routes: [
    ['GET',    '/api/v1/organizations/:orgId/teams'],
    ['POST',   '/api/v1/organizations/:orgId/teams'],
    ['GET',    '/api/v1/organizations/:orgId/teams/:teamId'],
    ['PATCH',  '/api/v1/organizations/:orgId/teams/:teamId'],
    ['DELETE', '/api/v1/organizations/:orgId/teams/:teamId'],
    ['GET',    '/api/v1/organizations/:orgId/teams/:teamId/members'],
    ['POST',   '/api/v1/organizations/:orgId/teams/:teamId/members'],
    ['DELETE', '/api/v1/organizations/:orgId/teams/:teamId/members/:memberId'],
    ['GET',    '/api/v1/organizations/:orgId/roles'],
    ['POST',   '/api/v1/organizations/:orgId/roles'],
    ['GET',    '/api/v1/organizations/:orgId/roles/:roleId'],
    ['PUT',    '/api/v1/organizations/:orgId/roles/:roleId'],
    ['GET',    '/api/v1/organizations/:orgId/roles/:roleId/permissions'],
    ['PUT',    '/api/v1/organizations/:orgId/roles/:roleId/permissions'],
  ]},
  // --- Integrations & Webhooks ---
  { routes: [
    ['GET',    '/api/v1/workspaces/:workspaceId/integrations'],
    ['POST',   '/api/v1/workspaces/:workspaceId/integrations'],
    ['GET',    '/api/v1/workspaces/:workspaceId/integrations/:integrationId'],
    ['PATCH',  '/api/v1/workspaces/:workspaceId/integrations/:integrationId'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/integrations/:integrationId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/integrations/:integrationId/config'],
    ['PUT',    '/api/v1/workspaces/:workspaceId/integrations/:integrationId/config'],
    ['POST',   '/api/v1/workspaces/:workspaceId/integrations/:integrationId/test-connection'],
    ['GET',    '/api/v1/workspaces/:workspaceId/webhooks'],
    ['POST',   '/api/v1/workspaces/:workspaceId/webhooks'],
    ['GET',    '/api/v1/workspaces/:workspaceId/webhooks/:webhookId'],
    ['PUT',    '/api/v1/workspaces/:workspaceId/webhooks/:webhookId'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/webhooks/:webhookId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/webhooks/:webhookId/deliveries'],
    ['GET',    '/api/v1/workspaces/:workspaceId/webhooks/:webhookId/deliveries/:deliveryId'],
  ]},
  // --- Notifications & User preferences ---
  { routes: [
    ['GET',    '/api/v1/users/:userId/notifications'],
    ['PATCH',  '/api/v1/users/:userId/notifications/mark-all-read'],
    ['GET',    '/api/v1/users/:userId/notifications/:notificationId'],
    ['PATCH',  '/api/v1/users/:userId/notifications/:notificationId'],
    ['DELETE', '/api/v1/users/:userId/notifications/:notificationId'],
    ['GET',    '/api/v1/users/:userId/preferences'],
    ['PUT',    '/api/v1/users/:userId/preferences'],
    ['GET',    '/api/v1/users/:userId/preferences/notifications'],
    ['PUT',    '/api/v1/users/:userId/preferences/notifications'],
    ['GET',    '/api/v1/users/:userId/api-keys'],
    ['POST',   '/api/v1/users/:userId/api-keys'],
    ['DELETE', '/api/v1/users/:userId/api-keys/:keyId'],
    ['GET',    '/api/v1/users/:userId/sessions'],
    ['DELETE', '/api/v1/users/:userId/sessions/:sessionId'],
  ]},
  // --- Documents & Attachments ---
  { routes: [
    ['GET',    '/api/v1/workspaces/:workspaceId/documents'],
    ['POST',   '/api/v1/workspaces/:workspaceId/documents'],
    ['GET',    '/api/v1/workspaces/:workspaceId/documents/:documentId'],
    ['PATCH',  '/api/v1/workspaces/:workspaceId/documents/:documentId'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/documents/:documentId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/documents/:documentId/versions'],
    ['GET',    '/api/v1/workspaces/:workspaceId/documents/:documentId/versions/:versionId'],
    ['POST',   '/api/v1/workspaces/:workspaceId/documents/:documentId/versions/:versionId/restore'],
    ['GET',    '/api/v1/workspaces/:workspaceId/documents/:documentId/collaborators'],
    ['POST',   '/api/v1/workspaces/:workspaceId/documents/:documentId/collaborators'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/documents/:documentId/collaborators/:collaboratorId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/documents/:documentId/comments'],
    ['POST',   '/api/v1/workspaces/:workspaceId/documents/:documentId/comments'],
  ]},
  // --- Channels & Messages (Slack-style) ---
  { routes: [
    ['GET',    '/api/v1/workspaces/:workspaceId/channels'],
    ['POST',   '/api/v1/workspaces/:workspaceId/channels'],
    ['GET',    '/api/v1/workspaces/:workspaceId/channels/:channelId'],
    ['PATCH',  '/api/v1/workspaces/:workspaceId/channels/:channelId'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/channels/:channelId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/channels/:channelId/messages'],
    ['POST',   '/api/v1/workspaces/:workspaceId/channels/:channelId/messages'],
    ['GET',    '/api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId'],
    ['PATCH',  '/api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId'],
    ['POST',   '/api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/reactions'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/reactions/:reactionId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/thread'],
    ['GET',    '/api/v1/workspaces/:workspaceId/channels/:channelId/pinned-messages'],
    ['POST',   '/api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/pin'],
  ]},
  // --- CI/CD Pipelines ---
  { routes: [
    ['GET',    '/api/v1/projects/:projectId/pipelines'],
    ['POST',   '/api/v1/projects/:projectId/pipelines'],
    ['GET',    '/api/v1/projects/:projectId/pipelines/:pipelineId'],
    ['DELETE', '/api/v1/projects/:projectId/pipelines/:pipelineId'],
    ['POST',   '/api/v1/projects/:projectId/pipelines/:pipelineId/trigger'],
    ['GET',    '/api/v1/projects/:projectId/pipelines/:pipelineId/runs'],
    ['GET',    '/api/v1/projects/:projectId/pipelines/:pipelineId/runs/:runId'],
    ['POST',   '/api/v1/projects/:projectId/pipelines/:pipelineId/runs/:runId/cancel'],
    ['POST',   '/api/v1/projects/:projectId/pipelines/:pipelineId/runs/:runId/retry'],
    ['GET',    '/api/v1/projects/:projectId/pipelines/:pipelineId/runs/:runId/logs'],
    ['GET',    '/api/v1/projects/:projectId/pipelines/:pipelineId/runs/:runId/artifacts'],
    ['GET',    '/api/v1/projects/:projectId/pipelines/:pipelineId/runs/:runId/artifacts/:artifactId'],
    ['GET',    '/api/v1/projects/:projectId/environments'],
    ['POST',   '/api/v1/projects/:projectId/environments'],
    ['GET',    '/api/v1/projects/:projectId/environments/:environmentId/deployments'],
  ]},
  // --- Reporting & Analytics ---
  { routes: [
    ['GET',    '/api/v1/organizations/:orgId/reports/usage-summary'],
    ['GET',    '/api/v1/organizations/:orgId/reports/active-users'],
    ['GET',    '/api/v1/organizations/:orgId/reports/storage-breakdown'],
    ['GET',    '/api/v1/organizations/:orgId/reports/export'],
    ['POST',   '/api/v1/organizations/:orgId/reports/export'],
    ['GET',    '/api/v1/projects/:projectId/analytics/velocity'],
    ['GET',    '/api/v1/projects/:projectId/analytics/burndown'],
    ['GET',    '/api/v1/projects/:projectId/analytics/cycle-time'],
    ['GET',    '/api/v1/projects/:projectId/analytics/team-workload'],
    ['GET',    '/api/v1/workspaces/:workspaceId/analytics/dashboard'],
    ['GET',    '/api/v1/workspaces/:workspaceId/analytics/metrics/:metricId'],
    ['GET',    '/api/v1/workspaces/:workspaceId/analytics/metrics/:metricId/time-series'],
  ]},
  // --- Search & Filters ---
  { routes: [
    ['GET',    '/api/v1/workspaces/:workspaceId/search/issues'],
    ['GET',    '/api/v1/workspaces/:workspaceId/search/documents'],
    ['GET',    '/api/v1/workspaces/:workspaceId/search/messages'],
    ['GET',    '/api/v1/workspaces/:workspaceId/saved-filters'],
    ['POST',   '/api/v1/workspaces/:workspaceId/saved-filters'],
    ['GET',    '/api/v1/workspaces/:workspaceId/saved-filters/:filterId'],
    ['PUT',    '/api/v1/workspaces/:workspaceId/saved-filters/:filterId'],
    ['DELETE', '/api/v1/workspaces/:workspaceId/saved-filters/:filterId'],
    ['GET',    '/api/v1/organizations/:orgId/custom-fields'],
    ['POST',   '/api/v1/organizations/:orgId/custom-fields'],
    ['GET',    '/api/v1/organizations/:orgId/custom-fields/:fieldId'],
    ['PUT',    '/api/v1/organizations/:orgId/custom-fields/:fieldId'],
    ['DELETE', '/api/v1/organizations/:orgId/custom-fields/:fieldId'],
    ['GET',    '/api/v1/organizations/:orgId/custom-fields/:fieldId/options'],
    ['POST',   '/api/v1/organizations/:orgId/custom-fields/:fieldId/options'],
  ]},
]

export function generateRoutes(target, baseRoutes = []) {
  const routes = []
  const seen = new Set()

  function add(method, url) {
    const key = `${method}:${url}`
    if (seen.has(key)) return false
    seen.add(key)
    routes.push({ method, url })
    return true
  }
  function full() { return routes.length >= target }

  // Phase 0: Seed with base routes if provided
  for (const r of baseRoutes) {
    add(r.method, r.url)
  }
  if (full()) return routes.slice(0, target)

  // Phase 0b: Common statics + wildcards
  add('GET', '/')
  add('GET', '/health')
  add('GET', '/version')
  add('GET', '/metrics')
  add('POST', '/auth/login')
  add('POST', '/auth/register')
  add('POST', '/auth/logout')
  add('POST', '/auth/refresh')
  add('GET', '/static/*')
  add('GET', '/api/v1/docs/*')
  if (full()) return routes.slice(0, target)

  // Phase 1: Interleave routes from domain modules — one route per module per round.
  // This ensures even distribution of shallow/deep and GET/POST/PUT/DELETE at any count.
  const maxModuleLen = Math.max(...domainModules.map(m => m.routes.length))
  for (let depth = 0; depth < maxModuleLen; depth++) {
    for (const mod of domainModules) {
      if (depth < mod.routes.length) {
        const [method, url] = mod.routes[depth]
        add(method, url)
        if (full()) return routes.slice(0, target)
      }
    }
  }

  return routes.slice(0, target)
}
