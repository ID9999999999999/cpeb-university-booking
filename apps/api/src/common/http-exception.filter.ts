import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let message: string | string[] = 'Internal server error';
    let error = HttpStatus[status] ?? 'Error';

    if (typeof raw === 'string') {
      message = raw;
    } else if (raw && typeof raw === 'object') {
      const payload = raw as Record<string, unknown>;
      if (typeof payload.message === 'string' || Array.isArray(payload.message)) {
        message = payload.message as string | string[];
      }
      if (typeof payload.error === 'string') {
        error = payload.error;
      }
    }

    if (status >= 500) {
      message = 'Internal server error';
    }

    const requestId =
      (request as Request & { requestId?: string }).requestId ?? randomUUID();

    response.setHeader('x-request-id', requestId);
    response.status(status).json({
      statusCode: status,
      error,
      message,
      method: request.method,
      path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
