import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { HomePage } from "@/app/pages/home";

export type AppContext = {};

export default defineApp([
  setCommonHeaders(),
  render(Document, [route("/", HomePage)]),
]);
