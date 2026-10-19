import { ExpressInterface } from './express.js'
import { FindMyWayInterface } from './find-my-way.js'
import { HonoRouterInterface } from './hono-router.js'
import { ProstoRouterInterface } from './prosto-router.js'
import { Rou3RouterInterface } from './rou3-router.js'
import { Rou3CompiledRouterInterface } from './rou3-compiled-router.js'

/** key -> router adapter class. Every adapter's lookup() returns a params object or null. */
export const routers = {
    prosto: ProstoRouterInterface,
    'find-my-way': FindMyWayInterface,
    rou3: Rou3RouterInterface,
    'rou3-compiled': Rou3CompiledRouterInterface,
    hono: HonoRouterInterface,
    express: ExpressInterface,
}
