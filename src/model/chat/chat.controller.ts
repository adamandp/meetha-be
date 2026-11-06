import { Controller, HttpCode, Get, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { ChatService } from "./chat.service";
@Controller()
export class ChatController {
  constructor(private readonly service: ChatService) {}
  @Get("v1/globals/uploadfiletobot")
  uploadfiletobot(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.uploadfiletobot(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/generateEventSummary")
  generateEventSummary(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.generateEventSummary(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/directanswarequestion")
  directanswarequestion(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.directanswarequestion(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/generateArticle")
  generateArticle(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.generateArticle(request, response);
  }
  @Get("v1/globals/getGeneratedArticle")
  getGeneratedArticle(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getGeneratedArticle(request, response);
  }
}
