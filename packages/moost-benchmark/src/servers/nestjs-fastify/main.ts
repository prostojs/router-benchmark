import 'reflect-metadata'
import cookie from '@fastify/cookie'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from '../nestjs-shared/app.module.js'
import { enableDbSimulation, closeDb } from '../nestjs-shared/app.controller.js'

export async function createServer({ simulateDb = false } = {}) {
  if (simulateDb) enableDbSimulation()

  const adapter = new FastifyAdapter()
  await adapter.getInstance().register(cookie)

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { logger: false },
  )
  await app.listen({ port: 0 })
  const server = app.getHttpServer()
  return {
    server,
    close: () => { closeDb(); return app.close() },
  }
}
