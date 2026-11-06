import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./billing.operations");
@Injectable()
export class BillingService {
  getUserBillingInfo(request: ApiRequest, response: Response) {
    return operations.getUserBillingInfo(request, response);
  }
  getUserTopupList(request: ApiRequest, response: Response) {
    return operations.getUserTopupList(request, response);
  }
  createTopup(request: ApiRequest, response: Response) {
    return operations.createTopup(request, response);
  }
  cancelTopup(request: ApiRequest, response: Response) {
    return operations.cancelTopup(request, response);
  }
  setExpiredTopup(request: ApiRequest, response: Response) {
    return operations.setExpiredTopup(request, response);
  }
  successTopup(request: ApiRequest, response: Response) {
    return operations.successTopup(request, response);
  }
  applyBilling(request: ApiRequest, response: Response) {
    return operations.applyBilling(request, response);
  }
  getUserBillingLogList(request: ApiRequest, response: Response) {
    return operations.getUserBillingLogList(request, response);
  }
}
