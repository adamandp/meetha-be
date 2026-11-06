import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { RecordingService } from "./recording.service";
@Controller()
export class RecordingController {
  constructor(private readonly service: RecordingService) {}
  @Get("v1/globals/streamLocalAudio")
  streamLocalAudio(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.streamLocalAudio(request, response);
  }
  @Get("v1/globals/downloadLocalAudio")
  downloadLocalAudio(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.downloadLocalAudio(request, response);
  }
}
