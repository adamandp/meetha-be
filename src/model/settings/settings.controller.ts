import { Controller, HttpCode, Get, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { SettingsService } from "./settings.service";
@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get("v1/globals/settings")
  getSettings(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getSettings(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/updateSettings")
  updateSettings(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.updateSettings(request, response);
  }
}
