import { Controller, HttpCode, Get, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import { AttendanceService } from "./attendance.service";
@Controller()
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}
  @Get("v1/globals/attendance/create")
  attendanceCreate(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.attendanceCreate(request, response);
  }
  @Get("v1/globals/attendance/update")
  attendanceUpdate(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.attendanceUpdate(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/attendance/delete")
  attendanceDelete(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.attendanceDelete(request, response);
  }
  @HttpCode(200)
  @Post("v1/globals/editAttendance")
  editAttendance(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.editAttendance(request, response);
  }
  @Get("v1/globals/attendances")
  attendances(@Req() request: ApiRequest, @Res() response: Response) {
    return this.service.attendances(request, response);
  }
}
