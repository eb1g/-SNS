"use client";

import Link from "next/link";
import { ArrowLeft, Github, KeyRound, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";
type OAuthProvider = "discord" | "github";

const socialProviders: Array<{ provider: OAuthProvider; label: string; mark: string; className: string }> = [
  { provider: "discord", label: "Discord", mark: "◉", className: "bg-[#5865f2] hover:bg-[#4752c4]" },
  { provider: "github", label: "GitHub", mark: "", className: "bg-[#24292f] hover:bg-[#17191c]" },
];

export function AuthForm({ initialSignup = false }: { initialSignup?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">(initialSignup ? "signup" : "login");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
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
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: mode === "signup", data: mode === "signup" ? { username, display_name: displayName.trim() || username } : undefined },
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else { setStep("otp"); setMessage(`${email} に6桁の確認コードを送信しました。`); }
  }

  async function ensureProfileAfterAuth() {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("ログイン情報を取得できませんでした。");
    const user = userData.user;
    const fallbackUsername = username || (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : `fox_${user.id.slice(0, 12)}`);
    const fallbackDisplayName = (displayName || user.user_metadata?.display_name || "きつね").trim();
    const { error } = await supabase.from("profiles").upsert({ id: user.id, username: fallbackUsername, display_name: fallbackDisplayName || "きつね", bio: "" }, { onConflict: "id" });
    if (error) throw error;
    return "/";
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (otp.length !== 6) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: otp, type: "email" });
      if (error) { setMessage(error.message); return; }
      window.location.assign(await ensureProfileAfterAuth());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "プロフィールの作成に失敗しました。");
    } finally { setBusy(false); }
  }

  async function signInWithProvider(provider: OAuthProvider) {
    setOauthBusy(provider); setMessage("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setMessage(error.message); setOauthBusy(null); }
  }

  const usernameState = availability === "taken" ? <span className="status-bad">既に使用されています！</span> : availability === "available" ? <span className="status-good">使用可能です！</span> : availability === "checking" ? <span className="helper">確認中...</span> : availability === "invalid" ? <span className="status-bad">3〜20文字の半角英数字と _ を使用してください</span> : null;

  return <main className="page-wrap auth-page"><section className="panel auth-card !rounded-3xl !border-orange-100 !shadow-[0_18px_55px_rgba(180,90,20,0.10)]">
    <div className="auth-emblem !rounded-2xl !bg-orange-100 !text-orange-700"><Sparkles size={24} /></div>
    {step === "details" ? <>
      <h1 className="page-heading">{mode === "signup" ? "きつね村に参加" : "おかえりなさい"}</h1>
      <p className="page-subtitle">メールアドレスに届く6桁コード、またはDiscord・GitHubでログインできます。</p>
      <form onSubmit={sendCode} className="space-y-1">
        {mode === "signup" && <>
          <div className="field"><label htmlFor="username">ユーザーID</label><input className="input" id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.trim().toLowerCase())} placeholder="kitsune_01" required minLength={3} maxLength={20} />{usernameState}</div>
          <div className="field"><label htmlFor="displayName">表示名</label><input className="input" id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="こんこん" maxLength={40} /></div>
        </>}
        <div className="field"><label htmlFor="email">メールアドレス</label><input className="input" id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
        {message && <p className="notice notice-error" role="status">{message}</p>}
        <button className="button button-primary !mt-1 !min-h-12 !w-full !rounded-xl !bg-orange-500 hover:!bg-orange-600" disabled={busy || (mode === "signup" && availability !== "available")}><Mail size={16} />{busy ? "送信中..." : "6桁コードを送る"}</button>
      </form>
      <div className="my-7 flex items-center gap-3 text-xs text-stone-400"><div className="h-px flex-1 bg-orange-100" /><span>または以下でログイン</span><div className="h-px flex-1 bg-orange-100" /></div>
      <div className="grid grid-cols-2 gap-3">
        {socialProviders.map(({ provider, label, mark, className }) => <button key={provider} type="button" onClick={() => void signInWithProvider(provider)} disabled={busy || oauthBusy !== null} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} aria-label={`${label}でログイン`}>
          {provider === "github" ? <Github size={18} /> : <span className="text-lg leading-none">{mark}</span>}{oauthBusy === provider ? "接続中..." : label}
        </button>)}
      </div>
      <p className="helper" style={{marginTop:18,textAlign:"center"}}>{mode === "signup" ? "すでにアカウントをお持ちですか？" : "はじめての方はこちら"} <button type="button" className="icon-button" style={{color:"var(--fox-dark)",fontWeight:700}} onClick={() => {setMode(mode === "signup" ? "login" : "signup");setMessage("");}}> {mode === "signup" ? "ログイン" : "新規登録"}</button></p>
    </> : <>
      <button type="button" className="icon-button" onClick={() => {setStep("details");setOtp("");}}><ArrowLeft size={15} /> 入力に戻る</button>
      <h1 className="page-heading" style={{marginTop:10}}>6桁コードを入力</h1><p className="page-subtitle">{email} に届いたコードを入力してください。</p>
      <form onSubmit={verifyCode}><div className="field"><label htmlFor="otp">ワンタイムコード</label><input className="input otp-input" id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></div>
        {message && <p className="notice notice-error" role="status">{message}</p>}
        <button className="button button-primary !min-h-12 !w-full !rounded-xl !bg-orange-500 hover:!bg-orange-600" disabled={busy || otp.length !== 6}><KeyRound size={16} />{busy ? "確認中..." : "ログイン"}</button>
      </form><button type="button" className="icon-button" style={{marginTop:10}} onClick={() => void createClient().auth.signInWithOtp({email: email.trim(), options:{shouldCreateUser:mode === "signup", data:{username,display_name:displayName || username}}})}>コードを再送する</button>
    </>}
    <p className="helper" style={{marginTop:15}}>続行すると、きつねSNSの利用規約に同意したものとみなされます。</p>
    <Link href="/" className="helper" style={{display:"inline-block",marginTop:8}}>トップへ戻る</Link>
  </section></main>;
}
