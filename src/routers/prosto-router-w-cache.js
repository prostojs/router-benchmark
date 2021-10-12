import { ProstoRouter } from '../../../prosto-router/build/index.js'
import { ProstoRouterInterface } from './prosto-router.js'

export class ProstoRouterWCacheInterface extends ProstoRouterInterface {
    init() {
        this.router = new ProstoRouter({
            logLevel: 1,
            cacheLimit: 50,
        })
    }
    getName() {
        return 'ProstoRouter w/CACHE'
    }
}