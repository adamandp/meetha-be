import { Controller, HttpCode, Get, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { SpeechService } from "./speech.service";
@Controller()
export class SpeechController {
  constructor(private readonly service: SpeechService) {}
  @Get("v1/globals/events/:eventId/inappropriate-speech")
  get(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.get(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/events/:eventId/inappropriate-speech")
  check(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.check(request, response);
  }
}
