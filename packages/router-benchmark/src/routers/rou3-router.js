import { createRouter, addRoute, findRoute } from 'rou3'

const EMPTY = Object.freeze({})

export class Rou3RouterInterface {
    init() {
        this.router = createRouter()
    }
    registerRoutes(routes) {
        // rou3 uses ** for a multi-segment catch-all
        for (const route of routes) addRoute(this.router, route.method, route.url.replace(/\*$/, '**'), 'ok')
    }
    lookup(method, url) {
        const r = findRoute(this.router, method, url)
        return r === undefined ? null : (r.params ?? EMPTY)
    }
    getName() {
        return 'Rou3'
    }
}
