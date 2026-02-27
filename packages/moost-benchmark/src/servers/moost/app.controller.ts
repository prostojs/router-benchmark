import { Get, Post, Put, Delete, SetHeader, Body } from '@moostjs/event-http'
import { Controller, Param, Intercept } from 'moost'
import { SESSION_COOKIE } from '../../routes.js'
import { headerAuthGuard, cookieAuthGuard } from './guards.js'
import { createDb, type Db } from '../../simulate-db.js'

let db: Db | null = null
export function enableDbSimulation() {
  db = createDb()
}
export function closeDb() {
  if (db) db.close()
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
  async login(@Body() _body: unknown) { if (db) await db.set('session'); return 'token' }

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
  async getUsers() { if (db) await db.get('users'); return 'users' }

  @Get('users/:userId')
  async getUser(@Param('userId') userId: string) { if (db) await db.get('user'); return userId }

  @Get('users/:userId/profile')
  async getUserProfile(@Param('userId') userId: string) { if (db) await db.get('profile'); return userId }

  @Get('projects')
  async getProjects() { if (db) await db.get('projects'); return 'projects' }

  @Post('projects')
  async createProject(@Body() _body: unknown) { if (db) await db.set('project'); return 'created' }

  @Get('projects/:projectId')
  async getProject(@Param('projectId') projectId: string) { if (db) await db.get('project'); return projectId }

  @Delete('projects/:projectId')
  async deleteProject(@Param('projectId') projectId: string) { if (db) await db.del('project'); return projectId }

  @Get('organizations/settings/billing/invoices')
  @SetHeader('Cache-Control', 'private, no-cache')
  async getInvoices() { if (db) await db.get('invoices'); return 'invoices' }
}

// --- Cookie-auth guarded routes ---

@Controller('api/v1')
@Intercept(cookieAuthGuard)
export class CookieAuthController {
  @Get('projects/:projectId/members')
  async getMembers(@Param('projectId') projectId: string) { if (db) await db.get('members'); return projectId }

  @Get('projects/:projectId/tasks')
  async getTasks(@Param('projectId') projectId: string) { if (db) await db.get('tasks'); return projectId }

  @Get('projects/:projectId/tasks/:taskId')
  async getTask(@Param('taskId') taskId: string) { if (db) await db.get('task'); return taskId }

  @Put('projects/:projectId/tasks/:taskId')
  async updateTask(@Param('taskId') taskId: string, @Body() _body: unknown) { if (db) await db.set('task'); return taskId }

  @Delete('projects/:projectId/tasks/:taskId')
  async deleteTask(@Param('taskId') taskId: string) { if (db) await db.del('task'); return taskId }

  @Get('projects/:projectId/tasks/:taskId/comments')
  async getComments(@Param('taskId') taskId: string) { if (db) await db.get('comments'); return taskId }

  @Post('projects/:projectId/tasks/:taskId/comments')
  async addComment(@Param('taskId') taskId: string, @Body() _body: unknown) { if (db) await db.set('comment'); return taskId }

  @Get('orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId')
  async getDeepTask(@Param('taskId') taskId: string) { if (db) await db.get('task'); return taskId }

  @Get('organizations/settings/billing/payment-methods')
  @SetHeader('Cache-Control', 'private, no-cache')
  async getPaymentMethods() { if (db) await db.get('methods'); return 'methods' }
}
