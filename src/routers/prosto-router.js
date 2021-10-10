import { ProstoRouter } from 'prosto-router'
import { RouterInterface } from './router-interface.js'

function noop () {}

export class ProstoRouterInterface extends RouterInterface {
    init() {
        this.router = new ProstoRouter({
            logLevel: 1
        })
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            this.router.on(route.method, route.url, noop)
        })
    }
    lookup(method, url) {
        this.router.lookup(method, url)
    }
    getName() {
        return 'ProstoRouter'
    }
}