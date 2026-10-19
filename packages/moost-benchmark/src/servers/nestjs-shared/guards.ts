import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { BEARER, SESSION_COOKIE } from '../../routes.js'

@Injectable()
export class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    if (request.headers.authorization !== BEARER) {
      throw new UnauthorizedException()
    }
    return true
  }
}

@Injectable()
export class CookieAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    if (!request.cookies || request.cookies.session !== SESSION_COOKIE) {
      throw new UnauthorizedException()
    }
    return true
  }
}
