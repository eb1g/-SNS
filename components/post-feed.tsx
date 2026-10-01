"use client";

import Image from "next/image";
import Link from "next/link";
import { ImagePlus, Send, ThumbsUp, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

export function PostFeed({ initialPosts, currentUserId }: { initialPosts: Post[]; currentUserId: string | null }) {
  const [posts, setPosts] = useState(initialPosts);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [popping, setPopping] = useState<string | null>(null);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.from("posts").select("id,user_id,content,image_url,created_at,profile:profiles!posts_user_id_fkey(username,display_name,avatar_url,custom_tags(tag_name)),likes(user_id)").order("created_at", { ascending: false }).limit(40);
    if (data) setPosts(data as unknown as Post[]);
  }
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createClient();
    const channel = supabase.channel("public-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);
  function chooseImage(file?: File) {
    if (preview) URL.revokeObjectURL(preview);
    setImage(file ?? null);
    setPreview(file ? URL.createObjectURL(file) : null);
  }
  async function submitPost() {
    if (!currentUserId) { window.location.assign("/login"); return; }
    if (!content.trim() && !image) return;
    setBusy(true); setNotice("");
    const supabase = createClient();
    let imageUrl: string | null = null;
    if (image) {
      const path = `${currentUserId}/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("post-images").upload(path, image, { upsert: false });
      if (error) { setNotice(error.message); setBusy(false); return; }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("posts").insert({ user_id: currentUserId, content: content.trim(), image_url: imageUrl });
    if (error) setNotice(error.message);
    else { setContent(""); chooseImage(); setNotice("投稿しました！こんこん！"); await refresh(); }
    setBusy(false);
  }
  async function toggleLike(post: Post) {
    if (!currentUserId) { window.location.assign("/login"); return; }
    const supabase = createClient();
    const hasLiked = post.likes?.some((like) => like.user_id === currentUserId);
    setPopping(post.id); window.setTimeout(() => setPopping(null), 400);
    if (!hasLiked) {
      try { const audio = new AudioContext(); const tone = audio.createOscillator(); const gain = audio.createGain(); tone.frequency.value = 740; gain.gain.setValueAtTime(0.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12); tone.connect(gain); gain.connect(audio.destination); tone.start(); tone.stop(audio.currentTime + 0.12); tone.onended = () => void audio.close(); } catch { /* Sound is an optional enhancement. */ }
      await supabase.from("likes").insert({ post_id: post.id, user_id: currentUserId });
    } else await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    await refresh();
  }
  return <>
    <article className="panel composer">
      <div className="composer-top"><span className="avatar"><UserRound size={19} /></span><textarea aria-label="投稿内容" maxLength={500} value={content} onChange={(event) => setContent(event.target.value)} placeholder={currentUserId ? "今日のこんこん！を書いてみよう" : "ログインして、きつね村に投稿しよう"} /></div>
      {preview && <Image src={preview} alt="投稿画像のプレビュー" width={680} height={380} unoptimized className="image-preview" />}
      <div className="composer-actions"><label className="icon-button file-label" title="画像を添付"><ImagePlus size={19} /><input type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0])} /></label><span className="helper">{content.length}/500 {notice && <span>{notice}</span>}</span><button className="button button-primary" onClick={submitPost} disabled={busy || (!content.trim() && !image)}><Send size={15} /> 投稿</button></div>
    </article>
    {!posts.length ? <div className="panel" style={{padding:25,textAlign:"center",color:"var(--muted)",fontSize:13}}>まだ投稿がありません。最初のこんこん！をどうぞ。</div> : posts.map((post) => {
      const liked = !!currentUserId && post.likes?.some((like) => like.user_id === currentUserId);
      const profile = (Array.isArray(post.profile) ? post.profile[0] : post.profile) as Post["profile"] | undefined;
      return <article className="panel post" key={post.id}>
        <div className="post-head"><Link href={`/user/${profile?.username ?? ""}`} className="avatar">{profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={42} height={42} unoptimized /> : <UserRound size={18} />}</Link><div className="post-author"><strong>{profile?.display_name ?? "きつね"}</strong><Link className="muted" href={`/user/${profile?.username ?? ""}`}>@{profile?.username ?? "unknown"}</Link>{profile?.custom_tags?.map((tag) => <span className="tag-badge" key={tag.tag_name}>{tag.tag_name}</span>)}</div><time className="post-time">{new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(post.created_at))}</time></div>
        {post.content && <p className="post-body">{post.content}</p>}{post.image_url && <Image src={post.image_url} alt="投稿画像" width={1000} height={650} unoptimized className="post-image" />}
        <div className="post-actions"><button className={`like-button ${liked ? "liked" : ""} ${popping === post.id ? "pop" : ""}`} onClick={() => void toggleLike(post)}><ThumbsUp size={14} /> こんこん！🦊 <span>{post.likes?.length ?? 0}</span></button></div>
      </article>;
    })}
  </>;
}
