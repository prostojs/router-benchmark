import 'reflect-metadata'
import cookieParser from 'cookie-parser'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from '../nestjs-shared/app.module.js'
import { enableDbSimulation } from '../nestjs-shared/app.controller.js'

export async function createServer({ simulateDb = false } = {}) {
  if (simulateDb) enableDbSimulation()

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false })
  app.disable('x-powered-by')
  app.use(cookieParser())
  await app.listen(0, '127.0.0.1')
  return { port: (app.getHttpServer().address() as { port: number }).port }
}
