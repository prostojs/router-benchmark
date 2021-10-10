export const routes = [
    { method: 'GET', url: '/user' },
    { method: 'GET', url: '/admin' },
    { method: 'GET', url: '/user/comments' },
    { method: 'GET', url: '/user/avatar' },
    { method: 'GET', url: '/user/rating' },
    { method: 'GET', url: '/user/reviews' },
    { method: 'GET', url: '/user/lookup/username/:username' },
    { method: 'GET', url: '/user/lookup/email/:address' },
    { method: 'GET', url: '/user/lookup/name/:firstName/:lastName' },
    { method: 'GET', url: '/event/:id' },
    { method: 'GET', url: '/event/:id/comments' },
    { method: 'POST', url: '/event/:id/comment' },
    { method: 'GET', url: '/map/:location/events' },
    { method: 'GET', url: '/status' },
    { method: 'GET', url: '/user/very/deeply/nested/route/hello/there/super/long' },
    { method: 'GET', url: '/static/*' }
  ]