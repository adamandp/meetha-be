import { Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { OnlineService } from "./online.service";
@Controller()
export class OnlineController {
  constructor(private readonly service: OnlineService) {}
  @HttpCode(200)
  @Post("v1/online/zoom/initiate")
  handleZoomMeeting(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.handleZoomMeeting(request, response);
  }
}
