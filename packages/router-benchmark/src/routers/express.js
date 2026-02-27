import { RouterInterface } from './router-interface.js'
import express from 'express'
const Router = express.Router

function noop () {}

export class ExpressInterface extends RouterInterface {
    init() {
        this.router = Router()
    }
    registerRoutes(routes) {
        routes.forEach(route => {
            // Express 5 (path-to-regexp v8) requires named wildcards
            const url = route.url.replace(/\*$/, '*path')
            const method = route.method.toLowerCase()
            this.router.route(url)[method](noop)
        })
    }
    lookup(method, url) {
        // Express populates req.params during handle
        const req = { method, url, params: {} }
        this.router.handle(req, {}, noop)
        return req.params
    }
    getName() {
        return 'Express'
    }
}
