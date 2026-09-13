import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string; user?: any }>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const requestedId = request.headers['x-request-id']?.toString().trim();
    const requestId =
      requestedId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestedId)
        ? requestedId
        : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const base = {
      requestId,
      method: request.method,
      path: request.path,
    };

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          JSON.stringify({
            ...base,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          }),
        );
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        this.logger.error(
          JSON.stringify({
            ...base,
            statusCode,
            durationMs: Date.now() - startedAt,
            error:
              error instanceof Error
                ? error.name
                : 'UnknownError',
          }),
        );

        return throwError(() => error);
      }),
    );
  }
}
