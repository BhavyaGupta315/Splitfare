import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "@/theme/colors";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles[variant].text.color}
        />
      ) : (
        <Text style={[styles.label, variantStyles[variant].text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles: Record<
  Variant,
  { container: ViewStyle; text: { color: string } }
> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.primaryText },
  },
  secondary: {
    container: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    text: { color: colors.textPrimary },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    text: { color: colors.textSecondary },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: "#ffffff" },
  },
};
