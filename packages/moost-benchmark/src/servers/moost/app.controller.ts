import { Get, Post, Put, Delete, SetHeader, Body, HttpError } from '@moostjs/event-http'
import { Controller, Param, Intercept } from 'moost'
import { SESSION_COOKIE, isValidBody } from '../../routes.js'
import { headerAuthGuard, cookieAuthGuard } from './guards.js'
import { createDb, type Db } from 'bench-utils/simulate-db'

let db: Db | null = null
export function enableDbSimulation() {
  db = createDb()
}

function assertValidBody(body: unknown) {
  if (!isValidBody(body)) throw new HttpError(400, 'Invalid body')
}

// --- Public routes ---

@Controller()
export class PublicController {
  @Get('')
  root() { return 'ok' }

  @Get('health')
  health() { return 'ok' }

  @Post('auth/login')
  @SetHeader('Set-Cookie', `session=${SESSION_COOKIE}; Path=/; HttpOnly`)
  login(@Body() body: unknown) { assertValidBody(body); return db ? db.set('session').then(() => 'token') : 'token' }

  @Get('static/*')
  @SetHeader('Cache-Control', 'public, max-age=31536000, immutable')
  staticFile() { return 'file' }

  @Get('api/v1/docs/*')
  @SetHeader('Cache-Control', 'public, max-age=3600')
  docs() { return 'doc' }
}

// --- Header-auth guarded routes ---

@Controller('api/v1')
@Intercept(headerAuthGuard)
export class HeaderAuthController {
  @Get('users')
  getUsers() { return db ? db.get('users').then(() => 'users') : 'users' }

  @Get('users/:userId')
  getUser(@Param('userId') userId: string) { return db ? db.get('user').then(() => userId) : userId }

  @Get('users/:userId/profile')
  getUserProfile(@Param('userId') userId: string) { return db ? db.get('profile').then(() => userId) : userId }

  @Get('projects')
  getProjects() { return db ? db.get('projects').then(() => 'projects') : 'projects' }

  @Post('projects')
  createProject(@Body() body: unknown) { assertValidBody(body); return db ? db.set('project').then(() => 'created') : 'created' }

  @Get('projects/:projectId')
  getProject(@Param('projectId') projectId: string) { return db ? db.get('project').then(() => projectId) : projectId }

  @Delete('projects/:projectId')
  deleteProject(@Param('projectId') projectId: string) { return db ? db.del('project').then(() => projectId) : projectId }

  @Get('organizations/settings/billing/invoices')
  @SetHeader('Cache-Control', 'private, no-cache')
  getInvoices() { return db ? db.get('invoices').then(() => 'invoices') : 'invoices' }
}

// --- Cookie-auth guarded routes ---

@Controller('api/v1')
@Intercept(cookieAuthGuard)
export class CookieAuthController {
  @Get('projects/:projectId/members')
  getMembers(@Param('projectId') projectId: string) { return db ? db.get('members').then(() => projectId) : projectId }

  @Get('projects/:projectId/tasks')
  getTasks(@Param('projectId') projectId: string) { return db ? db.get('tasks').then(() => projectId) : projectId }

  @Get('projects/:projectId/tasks/:taskId')
  getTask(@Param('taskId') taskId: string) { return db ? db.get('task').then(() => taskId) : taskId }

  @Put('projects/:projectId/tasks/:taskId')
  updateTask(@Param('taskId') taskId: string, @Body() body: unknown) { assertValidBody(body); return db ? db.set('task').then(() => taskId) : taskId }

  @Delete('projects/:projectId/tasks/:taskId')
  deleteTask(@Param('taskId') taskId: string) { return db ? db.del('task').then(() => taskId) : taskId }

  @Get('projects/:projectId/tasks/:taskId/comments')
  getComments(@Param('taskId') taskId: string) { return db ? db.get('comments').then(() => taskId) : taskId }

  @Post('projects/:projectId/tasks/:taskId/comments')
  addComment(@Param('taskId') taskId: string, @Body() body: unknown) { assertValidBody(body); return db ? db.set('comment').then(() => taskId) : taskId }

  @Get('orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId')
  getDeepTask(@Param('taskId') taskId: string) { return db ? db.get('task').then(() => taskId) : taskId }

  @Get('organizations/settings/billing/payment-methods')
  @SetHeader('Cache-Control', 'private, no-cache')
  getPaymentMethods() { return db ? db.get('methods').then(() => 'methods') : 'methods' }
}
