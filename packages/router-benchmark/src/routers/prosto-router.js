import { ProstoRouter } from '@prostojs/router'

function noop() {}

export class ProstoRouterInterface {
    init() {
        this.router = new ProstoRouter({ silent: true })
    }
    registerRoutes(routes) {
        for (const route of routes) this.router.on(route.method, route.url, noop)
    }
    lookup(method, url) {
        const r = this.router.lookup(method, url)
        return r === undefined ? null : r.ctx.params
    }
    getName() {
        return 'ProstoRouter'
    }
}
