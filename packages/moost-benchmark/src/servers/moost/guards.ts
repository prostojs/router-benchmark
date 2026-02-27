import { defineAuthGuard, HttpError } from '@moostjs/event-http'
import { AUTH_TOKEN, SESSION_COOKIE } from '../../routes.js'

export const headerAuthGuard = defineAuthGuard(
  { bearer: {} },
  (transports) => {
    if (transports.bearer !== AUTH_TOKEN) {
      throw new HttpError(401, 'Unauthorized')
    }
  },
)

export const cookieAuthGuard = defineAuthGuard(
  { cookie: { name: 'session' } },
  (transports) => {
    if (transports.cookie !== SESSION_COOKIE) {
      throw new HttpError(401, 'Unauthorized')
    }
  },
)
