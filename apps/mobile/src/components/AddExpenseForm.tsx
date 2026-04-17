import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { Input } from "./Input";
import * as api from "@/lib/api";
import { colors, radius, spacing } from "@/theme/colors";

interface Member {
  id: string;
  email: string;
  name: string;
}

interface Props {
  groupId: string;
  members: Member[];
  currentUserId: string;
  onDone: () => void;
  onCancel: () => void;
}

export function AddExpenseForm({
  groupId,
  members,
  currentUserId,
  onDone,
  onCancel,
}: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!description.trim() || isNaN(num) || num <= 0) {
      setError("Please enter a description and a valid amount.");
      return;
    }
    if (selectedArr.length < 2) {
      setError("Select at least 2 participants.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createExpense({
        groupId,
        amount: num,
        description: description.trim(),
        splitType: "EQUAL",
        participants: selectedArr,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Add Expense</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Input
        label="Description"
        placeholder="e.g. Dinner at restaurant"
        value={description}
        onChangeText={setDescription}
        autoFocus
      />

      <Input
        label="Amount (\u20B9)"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text style={styles.hint}>Paid by you (split equally)</Text>

      <View style={styles.chipGroup}>
        <Text style={styles.chipsLabel}>Split between</Text>
        <View style={styles.chips}>
          {members.map((m) => {
            const active = selected.has(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => toggle(m.id)}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {m.id === currentUserId ? "You" : m.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Add Expense"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.flex1}
        />
        <Button title="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chipGroup: {
    gap: spacing.sm,
  },
  chipsLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  chipActive: {
    backgroundColor: colors.chipActive,
  },
  chipInactive: {
    backgroundColor: colors.chipInactive,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.chipActiveText,
  },
  chipTextInactive: {
    color: colors.chipInactiveText,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
});
