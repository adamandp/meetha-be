import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { STATUS_CODES } from "node:http";
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (res.headersSent) return;
    if (error instanceof HttpException) {
      const body = error.getResponse();
      return res
        .status(error.getStatus())
        .send(
          typeof body === "string"
            ? { code: error.getStatus(), message: body }
            : body,
        );
    }
    const status = error.statusCode || 500;
    require("../common/app-logger/logger").error(
      { err: error },
      "Request failed",
    );
    return res
      .status(status)
      .send({
        code: status,
        message:
          process.env.NODE_ENV === "production" && !error.isOperational
            ? STATUS_CODES[500]
            : error.message || STATUS_CODES[status],
        ...(process.env.NODE_ENV === "development"
          ? { stack: error.stack }
          : {}),
      });
  }
}
