import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./speech.operations");
@Injectable()
export class SpeechService {
  get(request: ApiRequest, response: Response) {
    return operations.get(request, response);
  }
  check(request: ApiRequest, response: Response) {
    return operations.check(request, response);
  }
}
