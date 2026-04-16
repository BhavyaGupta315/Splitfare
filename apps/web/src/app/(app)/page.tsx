"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as api from "@/lib/api";

interface GroupSummary {
  id: string;
  name: string;
  createdAt: string;
  _count: { members: number };
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchGroups = () => {
    setLoading(true);
    api
      .getGroups()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchGroups, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.createGroup(newName.trim());
      setNewName("");
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const cancelCreate = () => {
    setShowCreate(false);
    setNewName("");
    setCreateError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Your Groups
        </h1>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            New Group
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              autoFocus
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition-shadow focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-700"
            />
            <button
              type="submit"
              disabled={creating}
              className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={cancelCreate}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
          {createError && (
            <p className="text-sm text-red-500 dark:text-red-400">{createError}</p>
          )}
        </form>
      )}

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800" />
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No groups yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
            >
              <div>
                <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {g.name}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {g._count.members} member{g._count.members !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-sm text-zinc-400">
                {new Date(g.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
