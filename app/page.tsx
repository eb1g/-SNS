import Link from "next/link";
import { ArrowRight, Flame, Leaf, Users } from "lucide-react";
import { PostFeed } from "@/components/post-feed";
import { createClient } from "@/lib/supabase/server";
import type { Post, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let user = null;
  let profile: Profile | null = null;
  let posts: Post[] = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    user = auth.user;
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      profile = data as Profile | null;
    }
    const { data } = await supabase.from("posts")
      .select("id,user_id,content,image_url,created_at,profile:profiles!posts_user_id_fkey(username,display_name,avatar_url,custom_tags(tag_name)),likes(user_id)")
      .order("created_at", { ascending: false }).limit(40);
    posts = (data ?? []) as unknown as Post[];
  }
  return <main className="page-wrap">
    {(!user || (profile && !profile.has_posted)) && <section className="welcome">
      <div className="welcome-copy">
        <span className="welcome-kicker">A LITTLE FOX COMMUNITY</span>
        <h1>{user ? `${profile?.display_name ?? "きつね"}さん、ようこそきつねSNSへ！` : "ようこそきつねSNSへ！"}</h1>
        <p>{user ? "最初の「こんこん！」（投稿）をしてみよう！" : "新規登録して投稿しよう！ きつね好きの毎日を、ここから。"}</p>
      </div>
      {!user && <div className="welcome-actions"><Link href="/login?mode=signup" className="button button-primary">新規登録 <ArrowRight size={16} /></Link><Link href="/login" className="button button-outline">ログイン</Link></div>}
    </section>}
    <div className="feed-layout">
      <section><div className="feed-title">みんなのこんこん！</div><PostFeed initialPosts={posts} currentUserId={user?.id ?? null} /></section>
      <aside className="sidebar">
        <div className="panel sidebar-box"><h3><Flame size={16} style={{display:"inline",color:"var(--fox)"}} /> 今日のきつね村</h3><p>きつね好きがつながる、小さくてあたたかなタイムライン。</p><div className="sidebar-line" /><p>写真やひとことを投稿して、みんなに「こんこん！」を届けよう。</p></div>
        <div className="panel sidebar-box"><h3><Users size={16} style={{display:"inline",color:"var(--green)"}} /> はじめまして</h3><p>プロフィールを整えたら、好きなことや今日の出来事をシェアしてみてね。</p><div className="sidebar-line" /><Link href={user ? "/settings" : "/login?mode=signup"} className="button button-soft" style={{width:"100%"}}><Leaf size={15} /> {user ? "プロフィールを整える" : "きつね村に参加"}</Link></div>
      </aside>
    </div>
  </main>;
}
