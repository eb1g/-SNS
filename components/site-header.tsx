"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, Settings, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
        setUsername(profile?.username ?? null);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);
  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/");
  }
  return <header className="site-header page-wrap">
    <Link href="/" className="brand"><span className="brand-mark"><Sparkles size={21} /></span><span>きつねSNS</span></Link>
    <nav className="header-links" aria-label="メインメニュー">
      {user ? <>
        {username && <Link href={`/user/${username}`}>プロフィール</Link>}
        <Link href="/settings" title="設定"><Settings size={17} /></Link>
        <button className="icon-button" onClick={signOut} title="ログアウト" aria-label="ログアウト"><LogOut size={17} /></button>
      </> : <><Link href="/login">ログイン</Link><Link href="/login?mode=signup" className="button button-primary">参加する</Link></>}
    </nav>
  </header>;
}
