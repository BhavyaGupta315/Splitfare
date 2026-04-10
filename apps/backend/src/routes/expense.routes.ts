import { Router, Request, Response, NextFunction } from "express";
import { createExpenseSchema } from "@splitfare/validation";
import { requireAuth } from "../middleware/auth.js";
import * as expenseService from "../services/expense.service.js";

const router = Router();

router.use(requireAuth);

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createExpenseSchema.parse(req.body);
    const expense = await expenseService.createExpense({
      ...input,
      paidBy: req.user!.userId,
    });
    res.status(201).json({ data: expense });
  } catch (err) {
    next(err);
  }
});

export default router;
