import { Get, Post, Put, Delete, SetHeader, Body } from '@moostjs/event-http'
import { Controller, Param, Intercept } from 'moost'
import { SESSION_COOKIE } from '../../routes.js'
import { headerAuthGuard, cookieAuthGuard } from './guards.js'

// --- Public routes ---

@Controller()
export class PublicController {
  @Get('')
  root() { return 'ok' }

  @Get('health')
  health() { return 'ok' }

  @Post('auth/login')
  @SetHeader('Set-Cookie', `session=${SESSION_COOKIE}; Path=/; HttpOnly`)
  login(@Body() _body: unknown) { return 'token' }

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
  getUsers() { return 'users' }

  @Get('users/:userId')
  getUser(@Param('userId') userId: string) { return userId }

  @Get('users/:userId/profile')
  getUserProfile(@Param('userId') userId: string) { return userId }

  @Get('projects')
  getProjects() { return 'projects' }

  @Post('projects')
  createProject(@Body() _body: unknown) { return 'created' }

  @Get('projects/:projectId')
  getProject(@Param('projectId') projectId: string) { return projectId }

  @Delete('projects/:projectId')
  deleteProject(@Param('projectId') projectId: string) { return projectId }

  @Get('organizations/settings/billing/invoices')
  @SetHeader('Cache-Control', 'private, no-cache')
  getInvoices() { return 'invoices' }
}

// --- Cookie-auth guarded routes ---

@Controller('api/v1')
@Intercept(cookieAuthGuard)
export class CookieAuthController {
  @Get('projects/:projectId/members')
  getMembers(@Param('projectId') projectId: string) { return projectId }

  @Get('projects/:projectId/tasks')
  getTasks(@Param('projectId') projectId: string) { return projectId }

  @Get('projects/:projectId/tasks/:taskId')
  getTask(@Param('taskId') taskId: string) { return taskId }

  @Put('projects/:projectId/tasks/:taskId')
  updateTask(@Param('taskId') taskId: string, @Body() _body: unknown) { return taskId }

  @Delete('projects/:projectId/tasks/:taskId')
  deleteTask(@Param('taskId') taskId: string) { return taskId }

  @Get('projects/:projectId/tasks/:taskId/comments')
  getComments(@Param('taskId') taskId: string) { return taskId }

  @Post('projects/:projectId/tasks/:taskId/comments')
  addComment(@Param('taskId') taskId: string, @Body() _body: unknown) { return taskId }

  @Get('orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId')
  getDeepTask(@Param('taskId') taskId: string) { return taskId }

  @Get('organizations/settings/billing/payment-methods')
  @SetHeader('Cache-Control', 'private, no-cache')
  getPaymentMethods() { return 'methods' }
}
