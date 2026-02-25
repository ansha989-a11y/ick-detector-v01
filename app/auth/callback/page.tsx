"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Exchange the email link tokens for a session
      await supabaseBrowser.auth.getSession();

      // Read ?next=... from the URL (client-side only)
      const next = new URLSearchParams(window.location.search).get("next");

      if (next === "checkout") {
        const { data } = await supabaseBrowser.auth.getSession();
        const token = data.session?.access_token;

        if (token) {
          const res = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });

          const json = await res.json();
          if (json?.url) {
            window.location.href = json.url;
            return;
          }
        }
      }

      router.replace("/");
    })();
  }, [router]);

  return <main style={{ padding: 24 }}>Signing you in…</main>;
}
