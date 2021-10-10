import { RouterInterface } from './router-interface.js'
import { default as Router } from 'express/lib/router/index.js'

function noop () {}

export class ExpressInterface extends RouterInterface {
    init() {
        this.router = Router()
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            if (route.method === 'GET') {
              this.router.route(route.url).get(noop)
            } else {
              this.router.route(route.url).post(noop)
            }
        })
    }
    lookup(method, url) {
        this.router.handle({ method, url })
    }
    getName() {
        return 'Express'
    }
}