import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./chat.operations");
@Injectable()
export class ChatService {
  uploadfiletobot(request: ApiRequest, response: Response) {
    return operations.uploadfiletobot(request, response);
  }
  generateEventSummary(request: ApiRequest, response: Response) {
    return operations.generateEventSummary(request, response);
  }
  directanswarequestion(request: ApiRequest, response: Response) {
    return operations.directanswarequestion(request, response);
  }
  generateArticle(request: ApiRequest, response: Response) {
    return operations.generateArticle(request, response);
  }
  getGeneratedArticle(request: ApiRequest, response: Response) {
    return operations.getGeneratedArticle(request, response);
  }
}
