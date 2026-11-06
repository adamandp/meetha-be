import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./user.operations");
@Injectable()
export class UserService {
  getUsers(request: ApiRequest, response: Response) {
    return operations.getUsers(request, response);
  }
  deleteUser(request: ApiRequest, response: Response) {
    return operations.deleteUser(request, response);
  }
  getUser(request: ApiRequest, response: Response) {
    return operations.getUser(request, response);
  }
  updateUser(request: ApiRequest, response: Response) {
    return operations.updateUser(request, response);
  }
}
