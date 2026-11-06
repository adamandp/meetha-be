import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./settings.operations");
@Injectable()
export class SettingsService {
  getSettings(request: ApiRequest, response: Response) {
    return operations.getSettings(request, response);
  }
  updateSettings(request: ApiRequest, response: Response) {
    return operations.updateSettings(request, response);
  }
}
