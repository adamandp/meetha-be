import { createZodDto } from "nestjs-zod";
import { login } from "../auth.validation";
export class LoginDto extends createZodDto(login.body) {}
