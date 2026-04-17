import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/context/auth";
import * as api from "@/lib/api";
import { colors, radius, spacing } from "@/theme/colors";

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<api.GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch {
      // surface silently for list fetch
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.createGroup(name.trim());
      setName("");
      setShowCreate(false);
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <Screen>
      <Header
        title="Your Groups"
        right={
          <Pressable onPress={handleLogout} hitSlop={8}>
            <Text style={styles.logout}>Logout</Text>
          </Pressable>
        }
      />

      {user && <Text style={styles.greeting}>Signed in as {user.name}</Text>}

      {!showCreate ? (
        <Button
          title="New Group"
          onPress={() => setShowCreate(true)}
          style={styles.topButton}
        />
      ) : (
        <View style={styles.createForm}>
          <Input
            placeholder="Group name"
            value={name}
            onChangeText={setName}
            autoFocus
            error={createError}
          />
          <View style={styles.row}>
            <Button
              title="Create"
              onPress={handleCreate}
              loading={creating}
              style={styles.flex1}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => {
                setShowCreate(false);
                setName("");
                setCreateError(null);
              }}
            />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No groups yet. Create one to get started.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(app)/groups/${item.id}`)}
              style={({ pressed }) => [
                styles.card,
                pressed && { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item._count.members} member
                  {item._count.members !== 1 ? "s" : ""}
                </Text>
              </View>
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logout: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  topButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  createForm: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  flex1: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  cardLeft: {
    gap: 2,
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xxl,
    fontSize: 14,
  },
});
