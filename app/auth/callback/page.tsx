"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // This exchanges the link tokens for a session
      await supabaseBrowser.auth.getSession();
      router.replace("/"); // send them back to home (or /app)
    })();
  }, [router]);

  return <main style={{ padding: 24 }}>Signing you in…</main>;
}
