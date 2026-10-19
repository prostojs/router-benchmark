import 'reflect-metadata'
import cookie from '@fastify/cookie'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from '../nestjs-shared/app.module.js'
import { enableDbSimulation } from '../nestjs-shared/app.controller.js'

export async function createServer({ simulateDb = false } = {}) {
  if (simulateDb) enableDbSimulation()

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false })
  // @fastify/cookie resolves a newer fastify for its types than the copy NestJS bundles
  await app.register(cookie as never)
  await app.listen(0, '127.0.0.1')
  return { server: app.getHttpServer() }
}
