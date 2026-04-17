import type { ApiResponse } from "@splitfare/types";

const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  }

  return json.data as T;
}

// Auth
export function loginWithGoogle(idToken: string) {
  return request<{ user: { id: string; email: string; name: string } }>(
    "/auth/google",
    { method: "POST", body: JSON.stringify({ idToken }) }
  );
}

export function logout() {
  return request<{ message: string }>("/auth/logout", { method: "POST" });
}

export function getMe() {
  return request<{ id: string; email: string; name: string }>("/auth/me");
}

// Groups
export function getGroups() {
  return request<
    { id: string; name: string; createdAt: string; _count: { members: number } }[]
  >("/groups");
}

export function createGroup(name: string) {
  return request<{ id: string; name: string }>(
    "/groups",
    { method: "POST", body: JSON.stringify({ name }) }
  );
}

export function getGroup(id: string) {
  return request<{
    id: string;
    name: string;
    createdBy: string;
    members: { id: string; userId: string; user: { id: string; email: string; name: string } }[];
  }>(`/groups/${id}`);
}

export function addMember(groupId: string, email: string) {
  return request<{ id: string }>(
    `/groups/${groupId}/members`,
    { method: "POST", body: JSON.stringify({ email }) }
  );
}

// Expenses
export function getGroupExpenses(groupId: string) {
  return request<
    {
      id: string;
      amount: number;
      currency: string;
      description: string;
      splitType: string;
      createdAt: string;
      payer: { id: string; name: string; email: string };
      splits: { userId: string; amount: number; settled: boolean; user: { name: string } }[];
    }[]
  >(`/groups/${groupId}/expenses`);
}

export function createExpense(data: {
  groupId: string;
  amount: number;
  description: string;
  splitType?: string;
  participants?: string[];
}) {
  return request<{ id: string }>(
    "/expenses",
    { method: "POST", body: JSON.stringify(data) }
  );
}

// Balances
export function getGroupBalances(groupId: string) {
  return request<{
    balances: { userId: string; userName: string; amount: number }[];
    transactions: { from: string; fromName: string; to: string; toName: string; amount: number }[];
  }>(`/groups/${groupId}/balances`);
}

// Settlements
export interface SettlementRecord {
  id: string;
  groupId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  settledAt: string;
  sender: { id: string; name: string; email: string };
  receiver: { id: string; name: string; email: string };
}

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
