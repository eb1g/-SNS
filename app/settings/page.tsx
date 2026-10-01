import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/profile-editor";
import { AccountSecurity } from "@/components/account-security";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "設定" };
export default async function SettingsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  let { data } = await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if (!data) {
    const fallbackUsername = (user.user_metadata?.username as string | undefined) || `fox_${user.id.slice(0, 12)}`;
    const fallbackDisplayName = (user.user_metadata?.display_name as string | undefined) || "きつね";
    const { data: createdProfile, error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: fallbackUsername,
      display_name: fallbackDisplayName,
      bio: "",
    }, { onConflict: "id" }).select("*").single();
    if (error) throw error;
    data = createdProfile as Profile;
  }
  return <main className="page-wrap settings-grid"><nav className="panel settings-nav"><a href="#profile">プロフィール</a><a href="#account">アカウント</a><Link href="/">タイムライン</Link></nav><div className="panel settings-content"><section id="profile"><ProfileEditor profile={data as Profile} /></section><div className="section-divider" /><section id="account"><AccountSecurity email={user.email ?? ""} /></section></div></main>;
}
