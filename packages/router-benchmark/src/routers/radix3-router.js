import { RouterInterface } from './router-interface.js'
import { createRouter } from 'radix3'

export class Radix3RouterInterface extends RouterInterface {
    init() {
        this.router = createRouter()
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            // radix3 uses /** for wildcard catch-all
            const url = route.url.replace(/\*$/, '**')
            this.router.insert(url, { payload: 'ok' })
        })
    }
    lookup(method, url) {
        return this.router.lookup(url)
    }
    getName() {
        return 'Radix3'
    }
}
