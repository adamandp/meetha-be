import { Controller, HttpCode, Get, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { TranscriptService } from "./transcript.service";
@Controller()
export class TranscriptController {
  constructor(private readonly service: TranscriptService) {}
  @Get("v1/globals/eventTranscripts")
  eventTranscripts(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.eventTranscripts(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/editTranscript")
  editTranscript(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.editTranscript(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/editTranscriptLive")
  editTranscriptLive(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.editTranscriptLive(request, response);
  }
  @Get("v1/globals/updateTranscript")
  updateTranscript(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.updateTranscript(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/deleteTranscript")
  deleteTranscript(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.deleteTranscript(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/deleteTranscriptOnly")
  deleteTranscriptOnly(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.deleteTranscriptOnly(request, response);
  }
}
