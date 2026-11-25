"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);
  return (
    <form action={action} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.email} required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
      <p className="hint">Forgotten your password? Ask KoreVia to reset it.</p>
    </form>
  );
}
