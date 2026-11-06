import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { verifyToken, renewToken, generateExpires } from "../common/auth/token";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride("public", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const result = await verifyToken(request);
    if (!result.ok)
      throw new HttpException(
        { success: false, message: "Invalid token" },
        401,
      );
    request.user = result.payload;
    if (result.payload.exp * 1000 - Date.now() < 3600000) {
      const renewed = await renewToken(
        request.headers.authorization.split(" ")[1],
        generateExpires(24),
      );
      if (renewed.ok)
        response.setHeader("Authorization", "Bearer " + renewed.token);
    }
    return true;
  }
}
