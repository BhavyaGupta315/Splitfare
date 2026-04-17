import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { useAuth } from "@/context/auth";
import * as api from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { colors, radius, spacing } from "@/theme/colors";

type Tab = "expenses" | "balances" | "members";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<api.GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<api.ExpenseItem[]>([]);
  const [balanceData, setBalanceData] = useState<api.BalanceData | null>(null);
  const [settlements, setSettlements] = useState<api.SettlementRecord[]>([]);
  const [tab, setTab] = useState<Tab>("expenses");
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const fetchGroup = useCallback(() => api.getGroup(id).then(setGroup), [id]);
  const fetchExpenses = useCallback(
    () => api.getGroupExpenses(id).then(setExpenses),
    [id]
  );
  const fetchBalances = useCallback(
    () => api.getGroupBalances(id).then(setBalanceData),
    [id]
  );
  const fetchSettlements = useCallback(
    () => api.getGroupSettlements(id).then(setSettlements),
    [id]
  );

  useEffect(() => {
    Promise.all([
      fetchGroup(),
      fetchExpenses(),
      fetchBalances(),
      fetchSettlements(),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchGroup, fetchExpenses, fetchBalances, fetchSettlements]);

  const handleSettle = useCallback(
    async (toUserId: string, amount: number) => {
      await api.createSettlement(id, toUserId, amount);
      await Promise.all([fetchBalances(), fetchSettlements()]);
    },
    [id, fetchBalances, fetchSettlements]
  );

  const handleAddMember = async () => {
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

  if (loading) {
    return (
      <Screen>
        <Header title="Loading..." back />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!group || !user) {
    return (
      <Screen>
        <Header title="Not found" back />
        <Text style={styles.empty}>Group not found.</Text>
      </Screen>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "expenses", label: "Expenses" },
    { key: "balances", label: "Balances" },
    { key: "members", label: `Members (${group.members.length})` },
  ];

  return (
    <Screen>
      <Header title={group.name} back />

      {!showAddExpense ? (
        <Button
          title="Add Expense"
          onPress={() => setShowAddExpense(true)}
          style={styles.topButton}
        />
      ) : (
        <View style={styles.formWrap}>
          <AddExpenseForm
            groupId={group.id}
            members={group.members.map((m) => m.user)}
            currentUserId={user.id}
            onDone={onExpenseAdded}
            onCancel={() => setShowAddExpense(false)}
          />
        </View>
      )}

      <View style={styles.tabs}>
        {tabs.map((t) => (
          <View key={t.key} style={styles.tabItem}>
            <Button
              title={t.label}
              variant={tab === t.key ? "primary" : "ghost"}
              onPress={() => setTab(t.key)}
            />
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scrollContent}
      >
        {tab === "expenses" && (
          <ExpensesList expenses={expenses} currentUserId={user.id} />
        )}
        {tab === "balances" && (
          <BalancesView
            data={balanceData}
            settlements={settlements}
            currentUserId={user.id}
            onSettle={handleSettle}
          />
        )}
        {tab === "members" && (
          <MembersView
            members={group.members}
            email={memberEmail}
            setEmail={setMemberEmail}
            onAdd={handleAddMember}
            adding={addingMember}
            error={memberError}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function ExpensesList({
  expenses,
  currentUserId,
}: {
  expenses: api.ExpenseItem[];
  currentUserId: string;
}) {
  if (expenses.length === 0) {
    return <Text style={styles.empty}>No expenses yet. Add one to get started.</Text>;
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {expenses.map((e) => {
        const paidByYou = e.payer.id === currentUserId;
        return (
          <View key={e.id} style={styles.row}>
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text style={styles.rowTitle}>{e.description}</Text>
              <Text style={styles.rowSubtitle}>
                Paid by {paidByYou ? "you" : e.payer.name}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.amount}>
                {formatCurrency(e.amount, e.currency)}
              </Text>
              <Text style={styles.dateText}>
                {new Date(e.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function BalancesView({
  data,
  settlements,
  currentUserId,
  onSettle,
}: {
  data: api.BalanceData | null;
  settlements: api.SettlementRecord[];
  currentUserId: string;
  onSettle: (toUserId: string, amount: number) => Promise<void>;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const promptSettle = (
    key: string,
    toUserId: string,
    toName: string,
    amount: number
  ) => {
    Alert.alert(
      "Settle up",
      `Settle ${formatCurrency(amount)} with ${toName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Settle",
          onPress: async () => {
            setPendingKey(key);
            setError(null);
            try {
              await onSettle(toUserId, amount);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to settle");
            } finally {
              setPendingKey(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionLabel}>Net Balances</Text>
        {data.balances.map((b) => {
          const tone =
            b.amount > 0
              ? { color: colors.success }
              : b.amount < 0
                ? { color: colors.danger }
                : { color: colors.textMuted };
          return (
            <View key={b.userId} style={styles.row}>
              <Text style={styles.rowTitle}>{b.userName}</Text>
              <Text style={[styles.amount, tone]}>
                {b.amount > 0 ? "+" : ""}
                {formatCurrency(b.amount)}
              </Text>
            </View>
          );
        })}
      </View>

      {data.transactions.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>Simplified Debts</Text>
          {data.transactions.map((t, idx) => {
            const key = `${t.from}-${t.to}-${idx}`;
            const youOwe = t.from === currentUserId;
            return (
              <View key={key} style={styles.txRow}>
                <Text style={styles.txText}>
                  <Text style={styles.txEmph}>
                    {youOwe ? "You" : t.fromName}
                  </Text>{" "}
                  owe{youOwe ? "" : "s"}{" "}
                  <Text style={styles.txEmph}>{t.toName}</Text>
                </Text>
                <View style={styles.txRight}>
                  <Text style={styles.amount}>{formatCurrency(t.amount)}</Text>
                  {youOwe && (
                    <Button
                      title={pendingKey === key ? "..." : "Settle"}
                      onPress={() => promptSettle(key, t.to, t.toName, t.amount)}
                      loading={pendingKey === key}
                    />
                  )}
                </View>
              </View>
            );
          })}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}

      {settlements.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>Settlement History</Text>
          {settlements.map((s) => {
            const youSent = s.fromUser === currentUserId;
            const youReceived = s.toUser === currentUserId;
            const fromLabel = youSent ? "You" : s.sender.name;
            const toLabel = youReceived ? "you" : s.receiver.name;
            return (
              <View key={s.id} style={styles.row}>
                <View style={{ gap: 2, flexShrink: 1 }}>
                  <Text style={styles.rowSubtitle}>
                    <Text style={styles.txEmph}>{fromLabel}</Text> paid{" "}
                    <Text style={styles.txEmph}>{toLabel}</Text>
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(s.settledAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.amount}>{formatCurrency(s.amount)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function MembersView({
  members,
  email,
  setEmail,
  onAdd,
  adding,
  error,
}: {
  members: api.GroupDetail["members"];
  email: string;
  setEmail: (v: string) => void;
  onAdd: () => void;
  adding: boolean;
  error: string | null;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Input
          placeholder="Add member by email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={error}
        />
        <Button title={adding ? "Adding..." : "Add"} onPress={onAdd} loading={adding} />
      </View>

      <View style={{ gap: spacing.sm }}>
        {members.map((m) => (
          <View key={m.id} style={styles.row}>
            <View style={{ gap: 2 }}>
              <Text style={styles.rowTitle}>{m.user.name}</Text>
              <Text style={styles.rowSubtitle}>{m.user.email}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  formWrap: {
    marginBottom: spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabItem: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  txText: {
    color: colors.textSecondary,
    fontSize: 13,
    flexShrink: 1,
  },
  txEmph: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  txRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
  },
});
