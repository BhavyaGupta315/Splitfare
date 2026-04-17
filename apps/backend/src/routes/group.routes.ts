import { Router, Request, Response, NextFunction } from "express";
import {
  createGroupSchema,
  addMemberSchema,
  createSettlementSchema,
} from "@splitfare/validation";
import { requireAuth } from "../middleware/auth.js";
import * as groupService from "../services/group.service.js";
import * as expenseService from "../services/expense.service.js";
import * as balanceService from "../services/balance.service.js";
import * as settlementService from "../services/settlement.service.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await groupService.getUserGroups(req.user!.userId);
    res.json({ data: groups });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = createGroupSchema.parse(req.body);
    const group = await groupService.createGroup(name, req.user!.userId);
    res.status(201).json({ data: group });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const group = await groupService.getGroupById(req.params.id, req.user!.userId);
    res.json({ data: group });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/members",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { email } = addMemberSchema.parse(req.body);
      const membership = await groupService.addMember(
        req.params.id,
        email,
        req.user!.userId
      );
      res.status(201).json({ data: membership });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id/expenses",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const expenses = await expenseService.getGroupExpenses(
        req.params.id,
        req.user!.userId
      );
      res.json({ data: expenses });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id/balances",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const result = await balanceService.getGroupBalances(
        req.params.id,
        req.user!.userId
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/settlements",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { toUserId, amount } = createSettlementSchema.parse(req.body);
      const settlement = await settlementService.createSettlement({
        groupId: req.params.id,
        fromUserId: req.user!.userId,
        toUserId,
        amount,
      });
      res.status(201).json({ data: settlement });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id/settlements",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const settlements = await settlementService.getGroupSettlements(
        req.params.id,
        req.user!.userId
      );
      res.json({ data: settlements });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
