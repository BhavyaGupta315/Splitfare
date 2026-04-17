import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/auth";

export default function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
