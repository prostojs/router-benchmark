import { RouterInterface } from './router-interface.js'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { TrieRouter } from 'hono/router/trie-router'

function noop() {}

export class HonoRouterInterface extends RouterInterface {
    init() {
        this._routes = []
        this._useTrie = false
        this.router = new RegExpRouter()
    }
    registerRoutes(routes) {
        this._routes = routes
        for (const route of routes) {
            const method = route.method.toUpperCase()
            const url = route.url.replace(/\*$/, '*')
            this.router.add(method, url, noop)
        }
        // RegExpRouter lazily compiles on first match — test it now
        try {
            this.router.match('GET', '/__test__')
        } catch {
            // Fall back to TrieRouter
            this._useTrie = true
            this.router = new TrieRouter()
            for (const route of routes) {
                const method = route.method.toUpperCase()
                const url = route.url.replace(/\*$/, '*')
                this.router.add(method, url, noop)
            }
        }
    }
    lookup(method, url) {
        const result = this.router.match(method, url)
        const matches = result[0]
        if (matches.length > 0) {
            if (this._useTrie) {
                // TrieRouter: result = [[[handler, params]]]
                // params already extracted as {key: value}
                return matches[0][1]
            }
            // RegExpRouter: result = [[[handler, paramIndexMap]], stash]
            // paramIndexMap = { paramName: stashIndex }
            const paramMap = matches[0][1]
            const stash = result[1]
            const params = {}
            for (const key in paramMap) {
                params[key] = stash[paramMap[key]]
            }
            return params
        }
        return null
    }
    getName() {
        return this._useTrie ? 'Hono (TrieRouter)' : 'Hono (RegExpRouter)'
    }
}
