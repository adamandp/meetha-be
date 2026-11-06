import { Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { EmailService } from "./email.service";
@Controller()
export class EmailController {
  constructor(private readonly service: EmailService) {}
  @HttpCode(200)
  @Post("v1/globals/shareMoMEmail")
  shareMoMEmail(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.shareMoMEmail(request, response);
  }
}
