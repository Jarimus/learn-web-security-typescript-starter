import type { RequestHandler } from "express";
import { sendErrorPage } from "./errors.ts";
import { timingSafeEqual } from "node:crypto";

export function validateRequestOrigin(appOrigin: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    if (req.header("Origin")) {
      if (req.header("Origin") == appOrigin) {
        next();
        return
      }
      sendErrorPage(res, 403, "Forbidden", "This request did not come from Bearly Secure.");
      return;
    }
    if (req.header("Referer")?.startsWith(appOrigin)) {
      next();
      return;
    }
    sendErrorPage(res, 403, "Forbidden", "This request did not come from Bearly Secure.");
  };
}

export function csrfTokensMatch(expected: string, actual: unknown): boolean {
  if (typeof actual !== "string") return false;
  const actual_buf = Buffer.from(actual);
  const expected_buf = Buffer.from(expected);
  if (actual_buf.length !== expected_buf.length) return false;
  return timingSafeEqual(actual_buf, expected_buf);
}
