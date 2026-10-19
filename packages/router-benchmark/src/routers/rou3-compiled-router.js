import { createRouter, addRoute } from 'rou3'
import { compileRouter } from 'rou3/compiler'

const EMPTY = Object.freeze({})

/** rou3 with its JIT compiler (`rou3/compiler`), the fastest documented rou3 mode. */
export class Rou3CompiledRouterInterface {
    init() {
        this.router = createRouter()
    }
    registerRoutes(routes) {
        for (const route of routes) addRoute(this.router, route.method, route.url.replace(/\*$/, '**'), 'ok')
        this.match = compileRouter(this.router)
    }
    lookup(method, url) {
        const r = this.match(method, url)
        return r === undefined ? null : (r.params ?? EMPTY)
    }
    getName() {
        return 'Rou3 (compiled)'
    }
}
