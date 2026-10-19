/**
 * key -> loader of the router adapter class. Every adapter's lookup() returns a params
 * object or null; getName() returns the display name and, optionally, getBackend() the
 * implementation it picked for the registered route set.
 * Loaded lazily so a measuring worker process only ever loads the one router it measures.
 */
export const routerLoaders = {
  prosto: async () => (await import('./prosto-router.js')).ProstoRouterInterface,
  'find-my-way': async () => (await import('./find-my-way.js')).FindMyWayInterface,
  rou3: async () => (await import('./rou3-router.js')).Rou3RouterInterface,
  'rou3-compiled': async () => (await import('./rou3-compiled-router.js')).Rou3CompiledRouterInterface,
  hono: async () => (await import('./hono-router.js')).HonoRouterInterface,
  express: async () => (await import('./express.js')).ExpressInterface,
}
