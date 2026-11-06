import { Controller, HttpCode, Get, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { EventService } from "./event.service";
@Controller()
export class EventController {
  constructor(private readonly service: EventService) {}
  @Get("v1/globals/events")
  getEvents(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.getEvents(request, response);
  }
  @Get("v1/globals/detailEvents")
  detailEvents(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.detailEvents(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/updateEventStatus")
  updateEventStatus(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.updateEventStatus(request, response);
  }
  @Get("v1/globals/updateEvent")
  updateEvent(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.updateEvent(request, response);
  }
  @Get("v1/globals/updateEventAuto")
  updateEventAuto(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.updateEventAuto(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/event/delete")
  eventDelete(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.eventDelete(request, response);
  }
}
