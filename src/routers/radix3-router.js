import { RouterInterface } from './router-interface.js'
import { createRouter } from 'radix3'

// function noop () {}

export class Radix3RouterInterface extends RouterInterface {
    init() {
        this.router = createRouter()
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            // route.method ??
            this.router.insert(route.url, { payload: 'ok' })
        })
    }
    lookup(method, url) {
        // method ??
        this.router.lookup(url)
    }
    getName() {
        return 'Radix3'
    }
}