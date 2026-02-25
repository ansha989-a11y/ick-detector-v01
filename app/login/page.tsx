"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  async function sendLink() {
    // Read `next` from the URL — e.g. /login?next=checkout
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "";

    // Pass `next` as a query param on the callback URL.
    // Supabase appends tokens as a hash (#access_token=...) so the query
    // param survives and the callback page can read it via window.location.search.
    const redirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabaseBrowser.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) alert(error.message);
    else alert("Check your email for the login link.");
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <h1>Login</h1>
      <p>We'll email you a sign-in link.</p>
      <input
        style={{ padding: 12, width: "100%", maxWidth: 420, marginTop: 12 }}
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button style={{ marginTop: 12, padding: 12 }} onClick={sendLink}>
        Send login link
      </button>
    </main>
  );
}
