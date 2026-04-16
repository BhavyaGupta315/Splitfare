import { Router, Request, Response, NextFunction } from "express";
import { googleAuthSchema } from "@splitfare/validation";
import { requireAuth } from "../middleware/auth.js";
import * as authService from "../services/auth.service.js";

const router = Router();

router.post(
  "/google",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = googleAuthSchema.parse(req.body);

      const profile = await authService.verifyGoogleToken(idToken);
      const user = await authService.upsertUser(profile);
      const token = authService.issueJwt(user.id, user.email);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, 
      });

      res.json({ data: { user: { id: user.id, email: user.email, name: user.name } } });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ data: { message: "Logged out" } });
});

router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getUserById(req.user!.userId);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
