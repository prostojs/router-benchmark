import { RouterInterface } from './router-interface.js'
import Router from 'find-my-way'

function noop () {}

export class FindMyWayInterface extends RouterInterface {
    init() {
        this.router = Router()
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            this.router.on(route.method, route.url, noop)
        })
    }
    lookup(method, url) {
        this.router.find(method, url)
    }
    getName() {
        return 'FindMyWay'
    }
}