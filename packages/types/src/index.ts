export enum SplitType {
  EQUAL = "EQUAL",
  EXACT = "EXACT",
  PERCENT = "PERCENT",
}


export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

export interface Membership {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: Date;
}

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  currency: string;
  description: string;
  splitType: SplitType;
  createdAt: Date;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  settled: boolean;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  settledAt: Date;
}


export interface SplitResult {
  userId: string;
  amount: number;
}

export interface Balance {
  userId: string;
  amount: number; 
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
