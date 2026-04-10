import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../config/app-error.js";
import type { ApiResponse } from "@splitfare/types";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.errors.map((e) => e.message).join(", "),
      },
    });
  }

  // Unexpected error
  if (process.env.NODE_ENV !== "test") {
    console.error("Unhandled error:", err);
  }
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
}
