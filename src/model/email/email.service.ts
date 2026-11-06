import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./email.operations");
@Injectable()
export class EmailService {
  shareMoMEmail(request: ApiRequest, response: Response) {
    return operations.shareMoMEmail(request, response);
  }
}
