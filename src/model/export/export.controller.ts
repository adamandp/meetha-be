import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { ExportService } from "./export.service";
@Controller()
export class ExportController {
  constructor(private readonly service: ExportService) {}
  @Get("v1/globals/exportEventTranscripts")
  exportEventTranscripts(
    @Req() request: ApiRequest,
    @Res() response: Response,
  ) {
    return this.service.exportEventTranscripts(request, response);
  }
  @Get("v1/globals/exportTranscriptToWord")
  exportEventTranscripts2(
    @Req() request: ApiRequest,
    @Res() response: Response,
  ) {
    return this.service.exportEventTranscripts(request, response);
  }
  @Get("v1/globals/exportVideoTranscripts")
  exportVideoTranscripts(
    @Req() request: ApiRequest,
    @Res() response: Response,
  ) {
    return this.service.exportVideoTranscripts(request, response);
  }
}
