import Router from 'find-my-way'

function noop() {}

export class FindMyWayInterface {
    init() {
        this.router = Router()
    }
    registerRoutes(routes) {
        for (const route of routes) this.router.on(route.method, route.url, noop)
    }
    lookup(method, url) {
        const r = this.router.find(method, url)
        return r === null ? null : r.params
    }
    getName() {
        return 'FindMyWay'
    }
}
