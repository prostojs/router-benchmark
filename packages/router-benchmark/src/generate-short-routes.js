// Generates short route sets (2-5 segments) — typical lightweight APIs.
// No deep /api/v1/ prefixes. Exercises shallow routing with many distinct prefixes.

const domainModules = [
  // --- Users ---
  { routes: [
    ['GET',    '/users'],
    ['POST',   '/users'],
    ['GET',    '/users/:id'],
    ['PATCH',  '/users/:id'],
    ['DELETE', '/users/:id'],
    ['GET',    '/users/:id/avatar'],
    ['PUT',    '/users/:id/avatar'],
    ['GET',    '/users/:id/settings'],
    ['PUT',    '/users/:id/settings'],
    ['GET',    '/users/:id/friends'],
  ]},
  // --- Posts ---
  { routes: [
    ['GET',    '/posts'],
    ['POST',   '/posts'],
    ['GET',    '/posts/:id'],
    ['PATCH',  '/posts/:id'],
    ['DELETE', '/posts/:id'],
    ['GET',    '/posts/:id/comments'],
    ['POST',   '/posts/:id/comments'],
    ['GET',    '/posts/:id/likes'],
    ['POST',   '/posts/:id/likes'],
    ['DELETE', '/posts/:id/likes'],
  ]},
  // --- Products ---
  { routes: [
    ['GET',    '/products'],
    ['POST',   '/products'],
    ['GET',    '/products/:id'],
    ['PUT',    '/products/:id'],
    ['DELETE', '/products/:id'],
    ['GET',    '/products/:id/reviews'],
    ['POST',   '/products/:id/reviews'],
    ['GET',    '/products/:id/images'],
    ['POST',   '/products/:id/images'],
    ['GET',    '/products/:id/variants'],
  ]},
  // --- Orders ---
  { routes: [
    ['GET',    '/orders'],
    ['POST',   '/orders'],
    ['GET',    '/orders/:id'],
    ['PATCH',  '/orders/:id'],
    ['DELETE', '/orders/:id'],
    ['GET',    '/orders/:id/items'],
    ['POST',   '/orders/:id/items'],
    ['GET',    '/orders/:id/payment'],
    ['POST',   '/orders/:id/refund'],
    ['GET',    '/orders/:id/tracking'],
  ]},
  // --- Categories ---
  { routes: [
    ['GET',    '/categories'],
    ['POST',   '/categories'],
    ['GET',    '/categories/:id'],
    ['PUT',    '/categories/:id'],
    ['DELETE', '/categories/:id'],
    ['GET',    '/categories/:id/items'],
    ['GET',    '/tags'],
    ['POST',   '/tags'],
    ['GET',    '/tags/:id'],
    ['DELETE', '/tags/:id'],
  ]},
  // --- Messages ---
  { routes: [
    ['GET',    '/chats'],
    ['POST',   '/chats'],
    ['GET',    '/chats/:id'],
    ['DELETE', '/chats/:id'],
    ['GET',    '/chats/:id/messages'],
    ['POST',   '/chats/:id/messages'],
    ['GET',    '/chats/:id/members'],
    ['POST',   '/chats/:id/members'],
    ['DELETE', '/chats/:id/members/:mid'],
    ['GET',    '/chats/:id/pinned'],
  ]},
  // --- Events ---
  { routes: [
    ['GET',    '/events'],
    ['POST',   '/events'],
    ['GET',    '/events/:id'],
    ['PUT',    '/events/:id'],
    ['DELETE', '/events/:id'],
    ['GET',    '/events/:id/attendees'],
    ['POST',   '/events/:id/attendees'],
    ['GET',    '/events/:id/schedule'],
    ['PUT',    '/events/:id/schedule'],
    ['POST',   '/events/:id/rsvp'],
  ]},
  // --- Files ---
  { routes: [
    ['GET',    '/files'],
    ['POST',   '/files'],
    ['GET',    '/files/:id'],
    ['DELETE', '/files/:id'],
    ['GET',    '/files/:id/download'],
    ['GET',    '/files/:id/meta'],
    ['PUT',    '/files/:id/meta'],
    ['GET',    '/folders'],
    ['POST',   '/folders'],
    ['GET',    '/folders/:id'],
  ]},
  // --- Notifications ---
  { routes: [
    ['GET',    '/notifications'],
    ['GET',    '/notifications/:id'],
    ['PATCH',  '/notifications/:id'],
    ['DELETE', '/notifications/:id'],
    ['POST',   '/notifications/read-all'],
    ['GET',    '/alerts'],
    ['POST',   '/alerts'],
    ['GET',    '/alerts/:id'],
    ['PATCH',  '/alerts/:id'],
    ['DELETE', '/alerts/:id'],
  ]},
  // --- Settings ---
  { routes: [
    ['GET',    '/settings'],
    ['PUT',    '/settings'],
    ['GET',    '/settings/profile'],
    ['PUT',    '/settings/profile'],
    ['GET',    '/settings/security'],
    ['PUT',    '/settings/security'],
    ['GET',    '/settings/billing'],
    ['PUT',    '/settings/billing'],
    ['GET',    '/config'],
    ['PUT',    '/config'],
  ]},
  // --- Teams ---
  { routes: [
    ['GET',    '/teams'],
    ['POST',   '/teams'],
    ['GET',    '/teams/:id'],
    ['PATCH',  '/teams/:id'],
    ['DELETE', '/teams/:id'],
    ['GET',    '/teams/:id/members'],
    ['POST',   '/teams/:id/members'],
    ['GET',    '/teams/:id/projects'],
    ['POST',   '/teams/:id/projects'],
    ['GET',    '/teams/:id/stats'],
  ]},
  // --- Reports ---
  { routes: [
    ['GET',    '/reports'],
    ['POST',   '/reports'],
    ['GET',    '/reports/:id'],
    ['DELETE', '/reports/:id'],
    ['GET',    '/reports/:id/export'],
    ['GET',    '/analytics'],
    ['GET',    '/analytics/daily'],
    ['GET',    '/analytics/weekly'],
    ['GET',    '/analytics/monthly'],
    ['GET',    '/analytics/custom'],
  ]},
  // --- Payments ---
  { routes: [
    ['GET',    '/invoices'],
    ['POST',   '/invoices'],
    ['GET',    '/invoices/:id'],
    ['DELETE', '/invoices/:id'],
    ['GET',    '/invoices/:id/pdf'],
    ['POST',   '/invoices/:id/send'],
    ['GET',    '/refunds'],
    ['POST',   '/refunds'],
    ['GET',    '/refunds/:id'],
    ['GET',    '/receipts/:id'],
  ]},
  // --- Bookmarks ---
  { routes: [
    ['GET',    '/bookmarks'],
    ['POST',   '/bookmarks'],
    ['GET',    '/bookmarks/:id'],
    ['DELETE', '/bookmarks/:id'],
    ['GET',    '/favorites'],
    ['POST',   '/favorites'],
    ['GET',    '/favorites/:id'],
    ['DELETE', '/favorites/:id'],
    ['GET',    '/pins'],
    ['POST',   '/pins'],
  ]},
  // --- Surveys ---
  { routes: [
    ['GET',    '/surveys'],
    ['POST',   '/surveys'],
    ['GET',    '/surveys/:id'],
    ['PUT',    '/surveys/:id'],
    ['DELETE', '/surveys/:id'],
    ['GET',    '/surveys/:id/responses'],
    ['POST',   '/surveys/:id/responses'],
    ['GET',    '/polls'],
    ['POST',   '/polls'],
    ['GET',    '/polls/:id'],
  ]},
  // --- Recipes ---
  { routes: [
    ['GET',    '/recipes'],
    ['POST',   '/recipes'],
    ['GET',    '/recipes/:id'],
    ['PUT',    '/recipes/:id'],
    ['DELETE', '/recipes/:id'],
    ['GET',    '/recipes/:id/steps'],
    ['POST',   '/recipes/:id/steps'],
    ['GET',    '/recipes/:id/ratings'],
    ['POST',   '/recipes/:id/ratings'],
    ['GET',    '/ingredients'],
  ]},
  // --- Playlists ---
  { routes: [
    ['GET',    '/playlists'],
    ['POST',   '/playlists'],
    ['GET',    '/playlists/:id'],
    ['PUT',    '/playlists/:id'],
    ['DELETE', '/playlists/:id'],
    ['GET',    '/playlists/:id/tracks'],
    ['POST',   '/playlists/:id/tracks'],
    ['DELETE', '/playlists/:id/tracks/:tid'],
    ['GET',    '/songs'],
    ['GET',    '/songs/:id'],
  ]},
  // --- Courses ---
  { routes: [
    ['GET',    '/courses'],
    ['POST',   '/courses'],
    ['GET',    '/courses/:id'],
    ['PUT',    '/courses/:id'],
    ['DELETE', '/courses/:id'],
    ['GET',    '/courses/:id/lessons'],
    ['POST',   '/courses/:id/lessons'],
    ['GET',    '/courses/:id/students'],
    ['POST',   '/courses/:id/enroll'],
    ['GET',    '/lessons/:id'],
  ]},
  // --- Contacts ---
  { routes: [
    ['GET',    '/contacts'],
    ['POST',   '/contacts'],
    ['GET',    '/contacts/:id'],
    ['PUT',    '/contacts/:id'],
    ['DELETE', '/contacts/:id'],
    ['GET',    '/contacts/:id/notes'],
    ['POST',   '/contacts/:id/notes'],
    ['GET',    '/addresses'],
    ['POST',   '/addresses'],
    ['GET',    '/addresses/:id'],
  ]},
  // --- Todos ---
  { routes: [
    ['GET',    '/todos'],
    ['POST',   '/todos'],
    ['GET',    '/todos/:id'],
    ['PATCH',  '/todos/:id'],
    ['DELETE', '/todos/:id'],
    ['GET',    '/checklists'],
    ['POST',   '/checklists'],
    ['GET',    '/checklists/:id'],
    ['PUT',    '/checklists/:id'],
    ['GET',    '/checklists/:id/items'],
  ]},
]

export function generateShortRoutes(target) {
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

  // Seed with a few statics
  add('GET', '/')
  add('GET', '/health')
  add('POST', '/login')
  add('POST', '/logout')
  if (full()) return routes.slice(0, target)

  // Interleave from domain modules
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

// Generate test URLs for a short-route set: [method, path, expectMatch]
export function generateShortTests(routes) {
  const statics = routes.filter(r => !r.url.includes(':') && !r.url.includes('*'))
  const param1 = routes.filter(r => (r.url.match(/:/g) || []).length === 1)
  const param2 = routes.filter(r => (r.url.match(/:/g) || []).length >= 2)

  function fillParams(url) {
    return url.replace(/:(\w+)/g, (_, name) => `${name}_val`)
  }

  function spread(arr, count) {
    if (arr.length <= count) return arr
    const step = arr.length / count
    const result = []
    for (let i = 0; i < count; i++) {
      result.push(arr[Math.floor(i * step)])
    }
    return result
  }

  const urls = []

  // Statics
  for (const r of spread(statics, 4)) {
    urls.push([r.method, r.url, true])
  }

  // 1-param routes
  for (const r of spread(param1, 6)) {
    urls.push([r.method, fillParams(r.url), true])
  }

  // 2-param routes
  for (const r of spread(param2, 3)) {
    urls.push([r.method, fillParams(r.url), true])
  }

  // 404
  urls.push(['GET', '/not/found', false])

  return urls
}
