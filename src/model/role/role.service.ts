import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./role.operations");
@Injectable()
export class RoleService {
  getRoles(request: ApiRequest, response: Response) {
    return operations.getRoles(request, response);
  }
  createRole(request: ApiRequest, response: Response) {
    return operations.createRole(request, response);
  }
  getRole(request: ApiRequest, response: Response) {
    return operations.getRole(request, response);
  }
  updateRole(request: ApiRequest, response: Response) {
    return operations.updateRole(request, response);
  }
  deleteRole(request: ApiRequest, response: Response) {
    return operations.deleteRole(request, response);
  }
}
