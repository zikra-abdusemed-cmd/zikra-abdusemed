"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export default function AdminLogin() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="brutal-box w-full max-w-sm p-8">
      <p className="brutal-border mb-5 inline-block rounded-full bg-sage px-3 py-1 text-xs font-bold uppercase tracking-widest">
        Admin
      </p>
      <h1 className="font-display text-3xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Enter the admin password to manage content.</p>

      <label htmlFor="password" className="mt-6 block text-sm font-bold">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        className="brutal-input mt-1.5"
      />

      {state && !state.ok && (
        <p role="alert" className="brutal-border mt-4 rounded-lg bg-clay px-3 py-2 text-sm font-semibold">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="brutal-btn mt-6 w-full !bg-plum text-white">
        {pending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
