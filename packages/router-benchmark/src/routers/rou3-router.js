import { RouterInterface } from './router-interface.js'
import { createRouter, addRoute, findRoute } from 'rou3'

export class Rou3RouterInterface extends RouterInterface {
    init() {
        this.router = createRouter()
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            // rou3 uses ** for wildcard catch-all
            const url = route.url.replace(/\*$/, '**')
            addRoute(this.router, route.method, url, 'ok')
        })
    }
    lookup(method, url) {
        return findRoute(this.router, method, url)
    }
    getName() {
        return 'Rou3'
    }
}
