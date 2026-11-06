import { Module } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { developmentTransport } from "./common/app-logger/transport";
import { CommonModule } from "./common/common.module";
import { AuthGuard } from "./guards/auth.guard";
import { HttpExceptionFilter } from "./exceptions/http-exception.filter";
import { EventModule } from "./model/event/event.module";
import { AttendanceModule } from "./model/attendance/attendance.module";
import { SettingsModule } from "./model/settings/settings.module";
import { ImportModule } from "./model/import/import.module";
import { ExportModule } from "./model/export/export.module";
import { ChatModule } from "./model/chat/chat.module";
import { BillingModule } from "./model/billing/billing.module";
import { RecordingModule } from "./model/recording/recording.module";
import { GlobalModule } from "./model/global/global.module";
import { TranscriptModule } from "./model/transcript/transcript.module";
import { EmailModule } from "./model/email/email.module";
import { AuthModule } from "./model/auth/auth.module";
import { UserModule } from "./model/user/user.module";
import { RoleModule } from "./model/role/role.module";
import { SpeechModule } from "./model/speech/speech.module";
import { OnlineModule } from "./model/online/online.module";
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || "info",
        transport: developmentTransport(),
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers.authorization",
        ],
      },
    }),
    CommonModule,
    EventModule,
    AttendanceModule,
    SettingsModule,
    ImportModule,
    ExportModule,
    ChatModule,
    BillingModule,
    RecordingModule,
    GlobalModule,
    TranscriptModule,
    EmailModule,
    AuthModule,
    UserModule,
    RoleModule,
    SpeechModule,
    OnlineModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
