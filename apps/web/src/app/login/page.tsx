"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/context/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            SplitFare
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Split expenses with friends
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (response) => {
              if (!response.credential) {
                setError("No credential received from Google.");
                return;
              }
              try {
                await login(response.credential);
                router.replace("/");
              } catch {
                setError("Login failed. Please try again.");
              }
            }}
            onError={() => setError("Google sign-in failed.")}
            size="large"
            width="320"
            text="continue_with"
          />
        </div>
      </div>
    </div>
  );
}
