import { diskStorage } from "multer";
import path from "node:path";
import config = require("../config/config");
export const uploadOptions = {
  storage: diskStorage({
    destination: config.paths.uploads,
    filename: (_req, file, done) => {
      const ext = path.extname(file.originalname);
      const base = path
        .basename(file.originalname, ext)
        .replace(/[`~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "_")
        .replaceAll(" ", "_")
        .replaceAll("-", "_");
      done(null, `${base}_${Date.now()}${ext}`);
    },
  }),
};
