import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./global.operations");
@Injectable()
export class GlobalService {
  getUsers(request: ApiRequest, response: Response) {
    return operations.getUsers(request, response);
  }
}
