import { Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { Public } from "../../decorators/public.decorator";
import { validateRequest } from "../../common/config/request-validation";
import * as validation from "./auth.validation";
import { AuthService } from "./auth.service";
@Controller()
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @HttpCode(200)
  @Post("v1/auth/register")
  @Public()
  register(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.register);
    return this.service.register(request, response);
  }
  @HttpCode(200)
  @Post("v1/auth/cakra_register")
  @Public()
  centralizedRegister(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.register);
    return this.service.centralizedRegister(request, response);
  }
  @HttpCode(200)
  @Post("v1/auth/rapi_login")
  @Public()
  rapi_login(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.login);
    return this.service.rapi_login(request, response);
  }
  @HttpCode(200)
  @Post("v1/auth/login")
  @Public()
  login(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.login);
    return this.service.login(request, response);
  }
  @HttpCode(200)
  @Post("v1/auth/reset-password")
  @Public()
  resetPassword(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.resetPassword);
    return this.service.resetPassword(request, response);
  }
}
