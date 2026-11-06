import { Injectable } from "@nestjs/common";
import type { ApiRequest } from "../../common/runtime/operation.interface";
import type { Response } from "express";
const operations = require("./transcript.operations");
@Injectable()
export class TranscriptService {
  eventTranscripts(request: ApiRequest, response: Response) {
    return operations.eventTranscripts(request, response);
  }
  editTranscript(request: ApiRequest, response: Response) {
    return operations.editTranscript(request, response);
  }
  editTranscriptLive(request: ApiRequest, response: Response) {
    return operations.editTranscriptLive(request, response);
  }
  updateTranscript(request: ApiRequest, response: Response) {
    return operations.updateTranscript(request, response);
  }
  deleteTranscript(request: ApiRequest, response: Response) {
    return operations.deleteTranscript(request, response);
  }
  deleteTranscriptOnly(request: ApiRequest, response: Response) {
    return operations.deleteTranscriptOnly(request, response);
  }
}
