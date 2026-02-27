import { ProstoRouter } from '@prostojs/router'
import { RouterInterface } from './router-interface.js'

function noop () {}

export class ProstoRouterInterface extends RouterInterface {
    init() {
        this.router = new ProstoRouter({
            silent: true,
        })
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            this.router.on(route.method, route.url, noop)
        })
    }
    lookup(method, url) {
        return this.router.lookup(method, url)
    }
    getName() {
        return 'ProstoRouter'
    }
}
