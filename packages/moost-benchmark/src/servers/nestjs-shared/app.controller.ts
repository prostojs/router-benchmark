import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Header,
  HttpCode,
  BadRequestException,
} from '@nestjs/common'
import { SESSION_COOKIE, isValidBody } from '../../routes.js'
import { HeaderAuthGuard, CookieAuthGuard } from './guards.js'
import { createDb, type Db } from 'bench-utils/simulate-db'

let db: Db | null = null
export function enableDbSimulation() {
  db = createDb()
}

function assertValidBody(body: unknown) {
  if (!isValidBody(body)) throw new BadRequestException('Invalid body')
}

// --- Public routes ---

@Controller()
export class PublicController {
  @Get()
  root() { return 'ok' }

  @Get('health')
  health() { return 'ok' }

  @Post('auth/login')
  @Header('Set-Cookie', `session=${SESSION_COOKIE}; Path=/; HttpOnly`)
  login(@Body() body: unknown) { assertValidBody(body); return db ? db.set('session').then(() => 'token') : 'token' }

  @Get('static/*')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  staticFile() { return 'file' }

  @Get('api/v1/docs/*')
  @Header('Cache-Control', 'public, max-age=3600')
  docs() { return 'doc' }
}

// --- Header-auth guarded routes ---

@Controller('api/v1')
@UseGuards(HeaderAuthGuard)
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
  @Header('Cache-Control', 'private, no-cache')
  getInvoices() { return db ? db.get('invoices').then(() => 'invoices') : 'invoices' }
}

// --- Cookie-auth guarded routes ---

@Controller('api/v1')
@UseGuards(CookieAuthGuard)
export class CookieAuthController {
  @Get('projects/:projectId/members')
  getMembers(@Param('projectId') projectId: string) { return db ? db.get('members').then(() => projectId) : projectId }

  @Get('projects/:projectId/tasks')
  getTasks(@Param('projectId') projectId: string) { return db ? db.get('tasks').then(() => projectId) : projectId }

  @Get('projects/:projectId/tasks/:taskId')
  getTask(@Param('taskId') taskId: string) { return db ? db.get('task').then(() => taskId) : taskId }

  @Put('projects/:projectId/tasks/:taskId')
  @HttpCode(201)
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
  @Header('Cache-Control', 'private, no-cache')
  getPaymentMethods() { return db ? db.get('methods').then(() => 'methods') : 'methods' }
}
