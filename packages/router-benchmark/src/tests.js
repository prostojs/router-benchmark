// [method, path, expectMatch] — expectMatch=false marks URLs that must hit no route.
export const tests = [
  {
    name: 'Short static',
    urls: [
      ['GET', '/health', true],
    ]
  },
  {
    name: 'Long static',
    urls: [
      ['GET', '/api/v1/account/settings/billing/invoices', true],
    ]
  },
  {
    name: 'Wildcard',
    urls: [
      ['GET', '/static/css/main.bundle.min.css', true],
    ]
  },
  {
    name: 'Single param',
    urls: [
      ['GET', '/api/v1/users/usr_abc123', true],
    ]
  },
  {
    name: 'Param + suffix',
    urls: [
      ['GET', '/api/v1/users/usr_abc123/profile', true],
    ]
  },
  {
    name: 'Param + tasks',
    urls: [
      ['GET', '/api/v1/projects/prj_001/tasks', true],
    ]
  },
  {
    name: 'Two params',
    urls: [
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042', true],
    ]
  },
  {
    name: 'Two params + suffix',
    urls: [
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042/comments', true],
    ]
  },
  {
    name: 'Four params',
    urls: [
      ['GET', '/api/v1/orgs/org_1/teams/team_5/projects/prj_001/tasks/tsk_042', true],
    ]
  },
  {
    name: 'POST with params',
    urls: [
      ['POST', '/api/v1/projects/prj_001/tasks/tsk_042/comments', true],
    ]
  },
  {
    name: 'PUT with params',
    urls: [
      ['PUT', '/api/v1/projects/prj_001/tasks/tsk_042', true],
    ]
  },
  {
    name: 'DELETE with params',
    urls: [
      ['DELETE', '/api/v1/projects/prj_001/tasks/tsk_042', true],
    ]
  },
  {
    name: '404 not found',
    urls: [
      ['GET', '/api/v1/this/does/not/exist', false],
    ]
  },
  {
    name: 'All together',
    urls: [
      ['GET', '/health', true],
      ['GET', '/api/v1/account/settings/billing/invoices', true],
      ['GET', '/static/css/main.bundle.min.css', true],
      ['GET', '/api/v1/users/usr_abc123', true],
      ['GET', '/api/v1/users/usr_abc123/profile', true],
      ['GET', '/api/v1/projects/prj_001/tasks', true],
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042', true],
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042/comments', true],
      ['GET', '/api/v1/orgs/org_1/teams/team_5/projects/prj_001/tasks/tsk_042', true],
      ['POST', '/api/v1/projects/prj_001/tasks/tsk_042/comments', true],
      ['PUT', '/api/v1/projects/prj_001/tasks/tsk_042', true],
      ['DELETE', '/api/v1/projects/prj_001/tasks/tsk_042', true],
      ['GET', '/api/v1/this/does/not/exist', false],
    ]
  },
]
