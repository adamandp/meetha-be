import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./export.operations");
@Injectable()
export class ExportService {
  exportEventTranscripts(request: ApiRequest, response: Response) {
    return operations.exportEventTranscripts(request, response);
  }
  exportVideoTranscripts(request: ApiRequest, response: Response) {
    return operations.exportVideoTranscripts(request, response);
  }
}
