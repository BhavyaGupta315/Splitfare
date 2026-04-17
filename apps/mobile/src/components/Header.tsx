import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/theme/colors";

interface Props {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
}

export function Header({ title, back, right }: Props) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {back && (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.backLabel}>{"‹"}</Text>
          </Pressable>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  back: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  backLabel: {
    fontSize: 28,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    flexShrink: 1,
  },
});
