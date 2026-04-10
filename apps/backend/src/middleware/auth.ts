import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthPayload } from "@splitfare/types";
import { env } from "../config/env.js";
import { AppError } from "../config/app-error.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return next(new AppError("UNAUTHORIZED", "Authentication required", 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError("UNAUTHORIZED", "Invalid or expired token", 401));
  }
}
