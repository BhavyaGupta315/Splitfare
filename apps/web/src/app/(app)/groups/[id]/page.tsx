"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/auth";
import * as api from "@/lib/api";
import { AddExpenseForm } from "@/components/add-expense-form";

type Tab = "expenses" | "balances" | "members";

interface Group {
  id: string;
  name: string;
  createdBy: string;
  members: {
    id: string;
    userId: string;
    user: { id: string; email: string; name: string };
  }[];
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
  payer: { id: string; name: string; email: string };
  splits: { userId: string; amount: number; settled: boolean; user: { name: string } }[];
}

interface BalanceData {
  balances: { userId: string; userName: string; amount: number }[];
  transactions: { from: string; fromName: string; to: string; toName: string; amount: number }[];
}

type SettlementRow = api.SettlementRecord;

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [tab, setTab] = useState<Tab>("expenses");
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const fetchGroup = () => api.getGroup(id).then(setGroup);
  const fetchExpenses = () => api.getGroupExpenses(id).then(setExpenses);
  const fetchBalances = () => api.getGroupBalances(id).then(setBalanceData);
  const fetchSettlements = () =>
    api.getGroupSettlements(id).then(setSettlements);

  useEffect(() => {
    Promise.all([
      fetchGroup(),
      fetchExpenses(),
      fetchBalances(),
      fetchSettlements(),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setAddingMember(true);
    setMemberError(null);
    try {
      await api.addMember(id, memberEmail.trim());
      setMemberEmail("");
      fetchGroup();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const onExpenseAdded = () => {
    setShowAddExpense(false);
    fetchExpenses();
    fetchBalances();
  };

  const handleSettle = async (toUserId: string, amount: number) => {
    await api.createSettlement(id, toUserId, amount);
    await Promise.all([fetchBalances(), fetchSettlements()]);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800" />
      </div>
    );
  }

  if (!group) {
    return <p className="mt-8 text-center text-zinc-500">Group not found.</p>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "expenses", label: "Expenses" },
    { key: "balances", label: "Balances" },
    { key: "members", label: `Members (${group.members.length})` },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {group.name}
        </h1>
        {!showAddExpense && (
          <button
            onClick={() => setShowAddExpense(true)}
            className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Add Expense
          </button>
        )}
      </div>

      {showAddExpense && (
        <AddExpenseForm
          groupId={id}
          members={group.members.map((m) => m.user)}
          currentUserId={user!.id}
          onDone={onExpenseAdded}
          onCancel={() => setShowAddExpense(false)}
        />
      )}

      <div className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "expenses" && (
          <ExpensesList expenses={expenses} currentUserId={user!.id} />
        )}
        {tab === "balances" && (
          <BalancesView
            data={balanceData}
            settlements={settlements}
            currentUserId={user!.id}
            onSettle={handleSettle}
          />
        )}
        {tab === "members" && (
          <MembersView
            members={group.members}
            memberEmail={memberEmail}
            setMemberEmail={setMemberEmail}
            onAdd={handleAddMember}
            adding={addingMember}
            error={memberError}
          />
        )}
      </div>
    </div>
  );
}

function ExpensesList({
  expenses,
  currentUserId,
}: {
  expenses: Expense[];
  currentUserId: string;
}) {
  if (expenses.length === 0) {
    return (
      <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">
        No expenses yet. Add one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((e) => {
        const paidByYou = e.payer.id === currentUserId;
        return (
          <div
            key={e.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {e.description}
                </h3>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Paid by {paidByYou ? "you" : e.payer.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {e.currency === "INR" ? "\u20B9" : e.currency}{" "}
                  {e.amount.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {new Date(e.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BalancesView({
  data,
  settlements,
  currentUserId,
  onSettle,
}: {
  data: BalanceData | null;
  settlements: SettlementRow[];
  currentUserId: string;
  onSettle: (toUserId: string, amount: number) => Promise<void>;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const settle = async (key: string, toUserId: string, toName: string, amount: number) => {
    if (!window.confirm(`Settle \u20B9${amount.toFixed(2)} with ${toName}?`)) return;
    setPendingKey(key);
    setError(null);
    try {
      await onSettle(toUserId, amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to settle");
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Net Balances
        </h3>
        <div className="space-y-2">
          {data.balances.map((b) => (
            <div
              key={b.userId}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <span className="text-zinc-900 dark:text-zinc-100">
                {b.userName}
              </span>
              <span
                className={`font-semibold ${
                  b.amount > 0
                    ? "text-green-600 dark:text-green-400"
                    : b.amount < 0
                      ? "text-red-500 dark:text-red-400"
                      : "text-zinc-400"
                }`}
              >
                {b.amount > 0 ? "+" : ""}
                {"\u20B9"}{b.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {data.transactions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Simplified Debts
          </h3>
          <div className="space-y-2">
            {data.transactions.map((t, i) => {
              const key = `${t.from}-${t.to}-${i}`;
              const youOwe = t.from === currentUserId;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">
                      {youOwe ? "You" : t.fromName}
                    </span>
                    {" owe"}
                    {youOwe ? "" : "s"}{" "}
                    <span className="font-medium">{t.toName}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {"\u20B9"}{t.amount.toFixed(2)}
                    </span>
                    {youOwe && (
                      <button
                        onClick={() => settle(key, t.to, t.toName, t.amount)}
                        disabled={pendingKey === key}
                        className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {pendingKey === key ? "Settling..." : "Settle"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {settlements.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Settlement History
          </h3>
          <div className="space-y-2">
            {settlements.map((s) => {
              const youSent = s.fromUser === currentUserId;
              const youReceived = s.toUser === currentUserId;
              const fromLabel = youSent ? "You" : s.sender.name;
              const toLabel = youReceived ? "you" : s.receiver.name;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium">{fromLabel}</span>
                      {" paid "}
                      <span className="font-medium">{toLabel}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {new Date(s.settledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {"\u20B9"}{s.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MembersView({
  members,
  memberEmail,
  setMemberEmail,
  onAdd,
  adding,
  error,
}: {
  members: Group["members"];
  memberEmail: string;
  setMemberEmail: (v: string) => void;
  onAdd: (e: React.FormEvent) => void;
  adding: boolean;
  error: string | null;
}) {
  return (
    <div>
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          placeholder="Add member by email"
          type="email"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition-shadow focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-700"
        />
        <button
          type="submit"
          disabled={adding}
          className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      <div className="mt-4 space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {m.user.name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {m.user.email}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
