import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
} from "@nestjs/common";
@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (String(context.switchToHttp().getRequest().user?.roleId) !== "1")
      throw new HttpException(
        {
          code: 403,
          message: "You don't have enough permission to perform this action",
        },
        403,
      );
    return true;
  }
}
