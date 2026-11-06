import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./auth.operations");
@Injectable()
export class AuthService {
  register(request: ApiRequest, response: Response) {
    return operations.register(request, response);
  }
  centralizedRegister(request: ApiRequest, response: Response) {
    return operations.centralizedRegister(request, response);
  }
  rapi_login(request: ApiRequest, response: Response) {
    return operations.rapi_login(request, response);
  }
  login(request: ApiRequest, response: Response) {
    return operations.login(request, response);
  }
  resetPassword(request: ApiRequest, response: Response) {
    return operations.resetPassword(request, response);
  }
}
