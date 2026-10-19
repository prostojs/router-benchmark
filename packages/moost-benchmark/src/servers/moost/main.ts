import { Moost, createLogger } from 'moost'
import { MoostHttp } from '@moostjs/event-http'
import { createServer as createHttpServer } from 'node:http'
import { PublicController, HeaderAuthController, CookieAuthController, enableDbSimulation } from './app.controller.js'

export async function createServer({ simulateDb = false } = {}) {
  if (simulateDb) enableDbSimulation()

  // Logging disabled (level 0 = fatal only), like `logger: false` for NestJS
  const app = new Moost({ logger: createLogger({ level: 0 }) })
  const httpAdapter = new MoostHttp()

  app.adapter(httpAdapter)
  await app.registerControllers(PublicController, HeaderAuthController, CookieAuthController).init()

  const server = createHttpServer(httpAdapter.getServerCb())
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { port: (server.address() as { port: number }).port }
}
