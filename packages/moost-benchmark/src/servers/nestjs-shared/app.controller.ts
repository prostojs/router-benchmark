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
} from '@nestjs/common'
import { SESSION_COOKIE } from '../../routes.js'
import { HeaderAuthGuard, CookieAuthGuard } from './guards.js'

// --- Public routes ---

@Controller()
export class PublicController {
  @Get()
  root() { return 'ok' }

  @Get('health')
  health() { return 'ok' }

  @Post('auth/login')
  @Header('Set-Cookie', `session=${SESSION_COOKIE}; Path=/; HttpOnly`)
  login(@Body() _body: unknown) { return 'token' }

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
  @Header('Cache-Control', 'private, no-cache')
  getInvoices() { return 'invoices' }
}

// --- Cookie-auth guarded routes ---

@Controller('api/v1')
@UseGuards(CookieAuthGuard)
export class CookieAuthController {
  @Get('projects/:projectId/members')
  getMembers(@Param('projectId') projectId: string) { return projectId }

  @Get('projects/:projectId/tasks')
  getTasks(@Param('projectId') projectId: string) { return projectId }

  @Get('projects/:projectId/tasks/:taskId')
  getTask(@Param('taskId') taskId: string) { return taskId }

  @Put('projects/:projectId/tasks/:taskId')
  @HttpCode(201)
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
  @Header('Cache-Control', 'private, no-cache')
  getPaymentMethods() { return 'methods' }
}
