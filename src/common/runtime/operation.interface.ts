import type { Request, Response } from "express";
import type { Pool } from "pg";
export interface ApiRequest extends Request {
  user: {
    userId?: number;
    roleId?: number;
    username?: string;
    [key: string]: unknown;
  };
  postgres: Pool;
  pool: () => Pool;
  core: any;
  zoomBot: any;
  midtrans_snap: any;
  file?: Express.Multer.File;
}
export type Operation = (request: ApiRequest, response: Response) => unknown;
