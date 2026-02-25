"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  async function sendLink() {
    const { error } = await supabaseBrowser.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) alert(error.message);
    else alert("Check your email for the login link.");
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <h1>Login</h1>
      <p>We’ll email you a sign-in link.</p>

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
