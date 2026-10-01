"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

export function AuthForm({ initialSignup = false }: { initialSignup?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">(initialSignup ? "signup" : "login");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "signup" || username.length < 3) { setAvailability(username.length ? "invalid" : "idle"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setAvailability("invalid"); return; }
    setAvailability("checking");
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { if (active) setAvailability("idle"); return; }
      const { data, error } = await createClient().from("profiles").select("id").eq("username", username).maybeSingle();
      if (active) setAvailability(error ? "idle" : data ? "taken" : "available");
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [username, mode]);

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage("Supabaseの接続情報が未設定です。.env.localを設定してください。"); setBusy(false); return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode === "signup", data: mode === "signup" ? { username, display_name: displayName.trim() || username } : undefined },
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else { setStep("otp"); setMessage(`${email} に確認コードを送信しました。`); }
  }
  async function ensureProfileAfterAuth() {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("ログイン情報を取得できませんでした。");
    const user = userData.user;
    const fallbackUsername = username || (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : `fox_${user.id.slice(0, 12)}`);
    const fallbackDisplayName = (displayName || user.user_metadata?.display_name || "きつね").trim();
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: fallbackUsername,
      display_name: fallbackDisplayName || "きつね",
      bio: "",
    }, { onConflict: "id" });
    if (error) throw error;
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    return profile ? "/" : "/settings";
  }
  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (otp.length !== 6) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await createClient().auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) { setMessage(error.message); return; }
      const nextPath = await ensureProfileAfterAuth();
      window.location.assign(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "プロフィールの作成に失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  const usernameState = availability === "taken" ? <span className="status-bad">既に使用されています！</span> : availability === "available" ? <span className="status-good">使用可能です！</span> : availability === "checking" ? <span className="helper">確認中...</span> : availability === "invalid" ? <span className="status-bad">3〜20文字の半角英数字と _ を使用してください</span> : null;
  return <main className="page-wrap auth-page"><section className="panel auth-card">
    <div className="auth-emblem"><Sparkles size={24} /></div>
    {step === "details" ? <>
      <h1 className="page-heading">{mode === "signup" ? "きつね村に参加" : "おかえりなさい"}</h1>
      <p className="page-subtitle">メールアドレスに届く6桁コードでログインします。</p>
      <form onSubmit={sendCode}>
        {mode === "signup" && <>
          <div className="field"><label htmlFor="username">ユーザーID</label><input className="input" id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.trim().toLowerCase())} placeholder="kitsune_01" required minLength={3} maxLength={20} />{usernameState}</div>
          <div className="field"><label htmlFor="displayName">表示名</label><input className="input" id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="こんこん" maxLength={40} /></div>
        </>}
        <div className="field"><label htmlFor="email">メールアドレス</label><input className="input" id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
        {message && <p className="notice notice-error" role="status">{message}</p>}
        <button className="button button-primary" style={{width:"100%",marginTop:5}} disabled={busy || (mode === "signup" && availability !== "available")}><Mail size={16} />{busy ? "送信中..." : "確認コードを送る"}</button>
      </form>
      <p className="helper" style={{marginTop:18,textAlign:"center"}}>{mode === "signup" ? "すでにアカウントをお持ちですか？" : "はじめての方はこちら"} <button className="icon-button" style={{color:"var(--fox-dark)",fontWeight:700}} onClick={() => {setMode(mode === "signup" ? "login" : "signup");setMessage("");}}> {mode === "signup" ? "ログイン" : "新規登録"}</button></p>
    </> : <>
      <button className="icon-button" onClick={() => {setStep("details");setOtp("");}}><ArrowLeft size={15} /> 入力に戻る</button>
      <h1 className="page-heading" style={{marginTop:10}}>6桁コードを入力</h1><p className="page-subtitle">{email} に届いたコードを入力してください。</p>
      <form onSubmit={verifyCode}><div className="field"><label htmlFor="otp">ワンタイムコード</label><input className="input otp-input" id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></div>
        {message && <p className="notice" role="status">{message}</p>}{message && message.includes("未設定") && <p className="notice notice-error">{message}</p>}
        <button className="button button-primary" style={{width:"100%"}} disabled={busy || otp.length !== 6}><KeyRound size={16} />{busy ? "確認中..." : "ログイン"}</button>
      </form><button className="icon-button" style={{marginTop:10}} onClick={() => void createClient().auth.signInWithOtp({email, options:{shouldCreateUser:mode === "signup", data:{username,display_name:displayName || username}}})}>コードを再送する</button>
    </>}
    <p className="helper" style={{marginTop:15}}>続行すると、きつねSNSの利用規約に同意したものとみなされます。</p>
    <Link href="/" className="helper" style={{display:"inline-block",marginTop:8}}>トップへ戻る</Link>
  </section></main>;
}
