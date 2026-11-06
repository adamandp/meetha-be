import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { GlobalService } from "./global.service";
@Controller()
export class GlobalController {
  constructor(private readonly service: GlobalService) {}
  @Get("v1/globals/users")
  getUsers(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getUsers(request, response);
  }
  @Get("v1/globals/getUsers")
  getUsers2(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getUsers(request, response);
  }
}
