import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./recording.operations");
@Injectable()
export class RecordingService {
  streamLocalAudio(request: ApiRequest, response: Response) {
    return operations.streamLocalAudio(request, response);
  }
  downloadLocalAudio(request: ApiRequest, response: Response) {
    return operations.downloadLocalAudio(request, response);
  }
}
