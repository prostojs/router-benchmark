import { Module } from '@nestjs/common'
import { PublicController, HeaderAuthController, CookieAuthController } from './app.controller.js'
import { HeaderAuthGuard, CookieAuthGuard } from './guards.js'

@Module({
  controllers: [PublicController, HeaderAuthController, CookieAuthController],
  providers: [HeaderAuthGuard, CookieAuthGuard],
})
export class AppModule {}
