import { Moost } from 'moost'
import { MoostHttp } from '@moostjs/event-http'
import { createServer as createHttpServer } from 'node:http'
import { PublicController, HeaderAuthController, CookieAuthController, enableDbSimulation, closeDb } from './app.controller.js'

export async function createServer({ simulateDb = false } = {}) {
  if (simulateDb) enableDbSimulation()

  const app = new Moost({ logLevel: 'error' })
  const httpAdapter = new MoostHttp()

  app.adapter(httpAdapter)
  await app.registerControllers(PublicController, HeaderAuthController, CookieAuthController).init()

  const server = createHttpServer(httpAdapter.getServerCb())
  await new Promise<void>((resolve) => server.listen(0, resolve))

  return {
    server,
    close: () => new Promise<void>((resolve) => {
      closeDb()
      server.close(() => resolve())
    }),
  }
}
