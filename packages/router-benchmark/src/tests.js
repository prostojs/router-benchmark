export const tests = [
  {
    name: 'Short static',
    urls: [
      ['GET', '/health'],
    ]
  },
  {
    name: 'Long static',
    urls: [
      ['GET', '/api/v1/account/settings/billing/invoices'],
    ]
  },
  {
    name: 'Wildcard',
    urls: [
      ['GET', '/static/css/main.bundle.min.css'],
    ]
  },
  {
    name: 'Single param',
    urls: [
      ['GET', '/api/v1/users/usr_abc123'],
    ]
  },
  {
    name: 'Param + suffix',
    urls: [
      ['GET', '/api/v1/users/usr_abc123/profile'],
    ]
  },
  {
    name: 'Param + tasks',
    urls: [
      ['GET', '/api/v1/projects/prj_001/tasks'],
    ]
  },
  {
    name: 'Two params',
    urls: [
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042'],
    ]
  },
  {
    name: 'Two params + suffix',
    urls: [
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042/comments'],
    ]
  },
  {
    name: 'Four params',
    urls: [
      ['GET', '/api/v1/orgs/org_1/teams/team_5/projects/prj_001/tasks/tsk_042'],
    ]
  },
  {
    name: 'POST with params',
    urls: [
      ['POST', '/api/v1/projects/prj_001/tasks/tsk_042/comments'],
    ]
  },
  {
    name: 'PUT with params',
    urls: [
      ['PUT', '/api/v1/projects/prj_001/tasks/tsk_042'],
    ]
  },
  {
    name: 'DELETE with params',
    urls: [
      ['DELETE', '/api/v1/projects/prj_001/tasks/tsk_042'],
    ]
  },
  {
    name: '404 not found',
    urls: [
      ['GET', '/api/v1/this/does/not/exist'],
    ]
  },
  {
    name: 'All together',
    urls: [
      ['GET', '/health'],
      ['GET', '/api/v1/account/settings/billing/invoices'],
      ['GET', '/static/css/main.bundle.min.css'],
      ['GET', '/api/v1/users/usr_abc123'],
      ['GET', '/api/v1/users/usr_abc123/profile'],
      ['GET', '/api/v1/projects/prj_001/tasks'],
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042'],
      ['GET', '/api/v1/projects/prj_001/tasks/tsk_042/comments'],
      ['GET', '/api/v1/orgs/org_1/teams/team_5/projects/prj_001/tasks/tsk_042'],
      ['POST', '/api/v1/projects/prj_001/tasks/tsk_042/comments'],
      ['PUT', '/api/v1/projects/prj_001/tasks/tsk_042'],
      ['DELETE', '/api/v1/projects/prj_001/tasks/tsk_042'],
      ['GET', '/api/v1/this/does/not/exist'],
    ]
  },
]
