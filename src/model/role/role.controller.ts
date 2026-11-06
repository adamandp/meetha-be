import {
  Controller,
  HttpCode,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { RoleGuard } from "../../guards/role.guard";
import { validateRequest } from "../../common/config/request-validation";
import * as validation from "./role.validation";
import { RoleService } from "./role.service";
@Controller()
@UseGuards(RoleGuard)
export class RoleController {
  constructor(private readonly service: RoleService) {}
  @Get("v1/roles")
  getRoles(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.getRoles);
    return this.service.getRoles(request, response);
  }
  @HttpCode(200)
  @Post("v1/roles")
  createRole(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.createRole);
    return this.service.createRole(request, response);
  }
  @Get("v1/roles/:roleId")
  getRole(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.getRole);
    return this.service.getRole(request, response);
  }
  @Patch("v1/roles/:roleId")
  updateRole(@Req() request: ApiRequest, @Res() response: Response) {
    validateRequest(request, validation.updateRole);
    return this.service.updateRole(request, response);
  }
  @Delete("v1/roles/:roleId")
  deleteRole(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.deleteRole(request, response);
  }
}
