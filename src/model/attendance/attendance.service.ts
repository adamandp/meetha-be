import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./attendance.operations");
@Injectable()
export class AttendanceService {
  attendanceCreate(request: ApiRequest, response: Response) {
    return operations.attendanceCreate(request, response);
  }
  attendanceUpdate(request: ApiRequest, response: Response) {
    return operations.attendanceUpdate(request, response);
  }
  attendanceDelete(request: ApiRequest, response: Response) {
    return operations.attendanceDelete(request, response);
  }
  editAttendance(request: ApiRequest, response: Response) {
    return operations.editAttendance(request, response);
  }
  attendances(request: ApiRequest, response: Response) {
    return operations.attendances(request, response);
  }
}
