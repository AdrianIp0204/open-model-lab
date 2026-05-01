"use client";

import type {
  AccountSavedCircuitDraft,
  AccountSavedCircuitRecord,
} from "@/lib/account/circuit-saves";

async function requestAccountCircuitSaves<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as
    | T
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      typeof (payload as { error?: string }).error === "string" &&
        (payload as { error?: string }).error
        ? (payload as { error?: string }).error!
        : "Account circuit saves request failed.",
    );
  }

  return payload as T;
}

export async function listAccountCircuitSaves() {
  return requestAccountCircuitSaves<{ items: AccountSavedCircuitRecord[] }>(
    "/api/account/circuit-saves",
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export async function saveAccountCircuitSave(input: AccountSavedCircuitDraft) {
  return requestAccountCircuitSaves<{
    savedCircuit: AccountSavedCircuitRecord;
    replacedExisting: boolean;
    items: AccountSavedCircuitRecord[];
  }>("/api/account/circuit-saves", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function renameAccountCircuitSave(input: { id: string; title: string }) {
  return requestAccountCircuitSaves<{
    savedCircuit: AccountSavedCircuitRecord;
    replacedExisting: boolean;
    items: AccountSavedCircuitRecord[];
  }>("/api/account/circuit-saves", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteAccountCircuitSave(input: { id: string }) {
  return requestAccountCircuitSaves<{ items: AccountSavedCircuitRecord[] }>(
    "/api/account/circuit-saves",
    {
      method: "DELETE",
      body: JSON.stringify(input),
    },
  );
}
