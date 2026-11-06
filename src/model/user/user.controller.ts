import { Controller, HttpCode, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { validateRequest } from "../../common/config/request-validation";
import * as validation from "./user.validation";
import { UserService } from "./user.service";
@Controller()
export class UserController {
  constructor(private readonly service: UserService) {}
  @Get("v1/users")
  getUsers(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.getUsers);
    return this.service.getUsers(request, response);
  }
  @Get("v1/users/nonop")
  getUsers2(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.getUsers);
    return this.service.getUsers(request, response);
  }
  @HttpCode(200)
  @Post("v1/users/delete")
  deleteUser(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.deleteUser(request, response);
  }
  @Get("v1/users/:userId")
  getUser(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.getUser);
    return this.service.getUser(request, response);
  }
  @Put("v1/users/:userId")
  updateUser(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.updateUser);
    return this.service.updateUser(request, response);
  }
}
