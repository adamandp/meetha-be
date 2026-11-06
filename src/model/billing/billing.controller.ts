import { Controller, HttpCode, Get, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { BillingService } from "./billing.service";
@Controller()
export class BillingController {
  constructor(private readonly service: BillingService) {}
  @Get("v1/globals/getUserBillingInfo")
  getUserBillingInfo(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getUserBillingInfo(request, response);
  }
  @Get("v1/globals/getUserTopupList")
  getUserTopupList(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getUserTopupList(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/createTopup")
  createTopup(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.createTopup(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/cancelTopup")
  cancelTopup(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.cancelTopup(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/setExpiredTopup")
  setExpiredTopup(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.setExpiredTopup(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/successTopup")
  successTopup(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.successTopup(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/applyBilling")
  applyBilling(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.applyBilling(request, response);
  }
  @Get("v1/globals/getUserBillingLogList")
  getUserBillingLogList(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getUserBillingLogList(request, response);
  }
}
