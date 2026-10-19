import { SmartRouter } from 'hono/router/smart-router'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { TrieRouter } from 'hono/router/trie-router'

function noop() {}

/**
 * Hono's default router: SmartRouter([RegExpRouter, TrieRouter]) — the same
 * composition `new Hono()` uses. It picks RegExpRouter when the route set can be
 * compiled into a single regex and falls back to TrieRouter otherwise.
 * Params are extracted explicitly (RegExpRouter returns lazy stash indexes).
 */
export class HonoRouterInterface {
    init() {
        this.router = new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })
    }
    registerRoutes(routes) {
        for (const route of routes) this.router.add(route.method, route.url, noop)
        // SmartRouter selects its backend on the first match
        this.router.match('GET', '/__init__')
    }
    lookup(method, url) {
        const result = this.router.match(method, url)
        const matches = result[0]
        if (matches.length === 0) return null
        const stash = result[1]
        if (stash === undefined) {
            // TrieRouter: params already extracted
            return matches[0][1]
        }
        // RegExpRouter: paramIndexMap = { name: stashIndex }
        const paramMap = matches[0][1]
        const params = {}
        for (const key in paramMap) params[key] = stash[paramMap[key]]
        return params
    }
    getName() {
        return `Hono (${this.router.activeRouter.name})`
    }
}
