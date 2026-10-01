"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid";
export function ProfileEditor({ profile }: { profile: Profile }) {
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);
  const [bannerPreview, setBannerPreview] = useState(profile.banner_url);
  const [check, setCheck] = useState<CheckState>("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (username === profile.username) { setCheck("available"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setCheck("invalid"); return; }
    setCheck("checking");
    let active = true;
    const timer = window.setTimeout(async () => {
      const { data, error } = await createClient().from("profiles").select("id").eq("username", username).maybeSingle();
      if (active) setCheck(error ? "idle" : data ? "taken" : "available");
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [username, profile.username]);
  async function upload(file: File | null, bucket: "avatars" | "banners") {
    if (!file) return bucket === "avatars" ? profile.avatar_url : profile.banner_url;
    const supabase = createClient();
    const path = `${profile.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (check !== "available") return;
    setBusy(true);setMessage("");
    try {
      const [avatarUrl,bannerUrl] = await Promise.all([upload(avatar,"avatars"),upload(banner,"banners")]);
      const { error } = await createClient().from("profiles").update({username,display_name:displayName.trim(),bio,avatar_url:avatarUrl,banner_url:bannerUrl}).eq("id",profile.id);
      if (error) throw error;
      setMessage("プロフィールを保存しました。"); window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存できませんでした。"); }
    setBusy(false);
  }
  return <form onSubmit={save}>
    <h1 className="page-heading">プロフィール</h1><p className="page-subtitle">きつね村でのあなたの顔を整えましょう。</p>
    <div className="upload-row"><div className="upload-box"><label htmlFor="avatar-file">アバター画像</label>{avatarPreview && <Image src={avatarPreview} alt="アバター" width={66} height={66} unoptimized className="avatar" style={{marginBottom:10}} />}<input id="avatar-file" type="file" accept="image/*" onChange={(event) => {const file=event.target.files?.[0] ?? null;setAvatar(file);if(file)setAvatarPreview(URL.createObjectURL(file));}} /></div>
    <div className="upload-box"><label htmlFor="banner-file">ヘッダーバナー</label>{bannerPreview && <Image src={bannerPreview} alt="バナー" width={170} height={54} unoptimized style={{width:"100%",height:54,objectFit:"cover",borderRadius:7,marginBottom:10}} />}<input id="banner-file" type="file" accept="image/*" onChange={(event) => {const file=event.target.files?.[0] ?? null;setBanner(file);if(file)setBannerPreview(URL.createObjectURL(file));}} /></div></div>
    <div className="field" style={{marginTop:18}}><label htmlFor="username">ユーザーID</label><input className="input" id="username" value={username} onChange={(event) => setUsername(event.target.value.trim().toLowerCase())} minLength={3} maxLength={20} required />{check === "taken" ? <span className="status-bad">既に使用されています！</span> : check === "available" ? <span className="status-good">使用可能です！</span> : check === "invalid" ? <span className="status-bad">3〜20文字の半角英数字と _ を使用してください</span> : check === "checking" ? <span className="helper">確認中...</span> : null}</div>
    <div className="field"><label htmlFor="display-name">表示名</label><input className="input" id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required /></div>
    <div className="field"><label htmlFor="bio">自己紹介</label><textarea className="textarea" id="bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} placeholder="好きなものや、きつね村でしたいこと" /><span className="helper">{bio.length}/280</span></div>
    {message && <p className="notice" role="status">{message}</p>}<button className="button button-primary" disabled={busy || check !== "available"}><Save size={16} />{busy ? "保存中..." : "プロフィールを保存"}</button>
  </form>;
}
