import Constants from "expo-constants";
import type { ApiResponse } from "@splitfare/types";
import { getToken } from "./storage";

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.length > 0) return envUrl;

  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3001`;
  }
  return "http://localhost:3001";
}

const BASE = resolveBaseUrl();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  }

  return json.data as T;
}

export type UserProfile = { id: string; email: string; name: string };

export function loginWithGoogle(idToken: string) {
  return request<{ user: UserProfile; token: string }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function logout() {
  return request<{ message: string }>("/auth/logout", { method: "POST" });
}

export function getMe() {
  return request<UserProfile>("/auth/me");
}

export type GroupSummary = {
  id: string;
  name: string;
  createdAt: string;
  _count: { members: number };
};

export function getGroups() {
  return request<GroupSummary[]>("/groups");
}

export function createGroup(name: string) {
  return request<{ id: string; name: string }>("/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export type GroupDetail = {
  id: string;
  name: string;
  createdBy: string;
  members: {
    id: string;
    userId: string;
    user: { id: string; email: string; name: string };
  }[];
};

export function getGroup(id: string) {
  return request<GroupDetail>(`/groups/${id}`);
}

export function addMember(groupId: string, email: string) {
  return request<{ id: string }>(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export type ExpenseItem = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  splitType: string;
  createdAt: string;
  payer: { id: string; name: string; email: string };
  splits: {
    userId: string;
    amount: number;
    settled: boolean;
    user: { name: string };
  }[];
};

export function getGroupExpenses(groupId: string) {
  return request<ExpenseItem[]>(`/groups/${groupId}/expenses`);
}

export function createExpense(data: {
  groupId: string;
  amount: number;
  description: string;
  splitType?: string;
  participants?: string[];
}) {
  return request<{ id: string }>("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type BalanceData = {
  balances: { userId: string; userName: string; amount: number }[];
  transactions: {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
  }[];
};

export function getGroupBalances(groupId: string) {
  return request<BalanceData>(`/groups/${groupId}/balances`);
}

export type SettlementRecord = {
  id: string;
  groupId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  settledAt: string;
  sender: { id: string; name: string; email: string };
  receiver: { id: string; name: string; email: string };
};

export function createSettlement(
  groupId: string,
  toUserId: string,
  amount: number
) {
  return request<SettlementRecord>(`/groups/${groupId}/settlements`, {
    method: "POST",
    body: JSON.stringify({ toUserId, amount }),
  });
}

export function getGroupSettlements(groupId: string) {
  return request<SettlementRecord[]>(`/groups/${groupId}/settlements`);
}
