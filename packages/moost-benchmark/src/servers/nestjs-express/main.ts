import 'reflect-metadata'
import cookieParser from 'cookie-parser'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../nestjs-shared/app.module.js'

export async function createServer() {
  const app = await NestFactory.create(AppModule, { logger: false })
  app.use(cookieParser())
  await app.listen(0)
  const server = app.getHttpServer()
  return {
    server,
    close: () => app.close(),
  }
}
