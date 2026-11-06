import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./online.operations");
@Injectable()
export class OnlineService {
  handleZoomMeeting(request: ApiRequest, response: Response) {
    return operations.handleZoomMeeting(request, response);
  }
}
