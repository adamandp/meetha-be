import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./event.operations");
@Injectable()
export class EventService {
  getEvents(request: ApiRequest, response: Response) {
    return operations.getEvents(request, response);
  }
  detailEvents(request: ApiRequest, response: Response) {
    return operations.detailEvents(request, response);
  }
  updateEventStatus(request: ApiRequest, response: Response) {
    return operations.updateEventStatus(request, response);
  }
  updateEvent(request: ApiRequest, response: Response) {
    return operations.updateEvent(request, response);
  }
  updateEventAuto(request: ApiRequest, response: Response) {
    return operations.updateEventAuto(request, response);
  }
  eventDelete(request: ApiRequest, response: Response) {
    return operations.eventDelete(request, response);
  }
}
