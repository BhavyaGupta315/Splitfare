import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/colors";

interface Props {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, padded = true, style }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
