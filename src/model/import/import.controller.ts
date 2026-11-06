import {
  Controller,
  HttpCode,
  Get,
  Post,
  Req,
  Res,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { uploadOptions } from "../../common/runtime/upload";
import { ImportService } from "./import.service";
@Controller()
export class ImportController {
  constructor(private readonly service: ImportService) {}
  @Get("v1/globals/importFileEvent")
  importFileEvent(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.importFileEvent(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/events/fileImportV2")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  eventsFileImportv2(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.eventsFileImportv2(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/restartImport")
  restartImport(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.restartImport(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/refreshImport")
  refreshImport(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.refreshImport(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/resetImport")
  resetImport(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.resetImport(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/stopImport")
  stopImport(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.stopImport(request, response);
  }
}
