import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./import.operations");
@Injectable()
export class ImportService {
  importFileEvent(request: ApiRequest, response: Response) {
    return operations.importFileEvent(request, response);
  }
  eventsFileImportv2(request: ApiRequest, response: Response) {
    return operations.eventsFileImportv2(request, response);
  }
  restartImport(request: ApiRequest, response: Response) {
    return operations.restartImport(request, response);
  }
  refreshImport(request: ApiRequest, response: Response) {
    return operations.refreshImport(request, response);
  }
  resetImport(request: ApiRequest, response: Response) {
    return operations.resetImport(request, response);
  }
}
