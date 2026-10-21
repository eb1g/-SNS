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
    
    if (mode === "signup" && availability !== "available") {
      
      setMessage(availability === "taken" ? "そのユーザーIDは既に使われています。別のIDを入力してください。" : "使用可能なユーザーIDを入力してください。");
      
      setBusy(false);
      
      return;
      
    }
    
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
    
















































