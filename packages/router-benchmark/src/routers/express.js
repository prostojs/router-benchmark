import express from 'express'

const Router = express.Router

function markMatched(req) { req.matched = true }
function noop() {}

/**
 * Express has no standalone matcher; the router is driven with a minimal fake
 * request. The (synchronous) route handler marks the request as matched so that
 * 404s can be told apart; params come from `req.params`.
 */
export class ExpressInterface {
    init() {
        this.router = Router()
    }
    registerRoutes(routes) {
        for (const route of routes) {
            // Express 5 (path-to-regexp v8) requires named wildcards
            const url = route.url.replace(/\*$/, '*path')
            this.router.route(url)[route.method.toLowerCase()](markMatched)
        }
    }
    lookup(method, url) {
        const req = { method, url, params: {}, matched: false }
        this.router.handle(req, {}, noop)
        return req.matched ? req.params : null
    }
    getName() {
        return 'Express'
    }
}
