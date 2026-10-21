"use client";


import Link from "next/link";import {Github,KeyRound,Mail,Sparkles,ArrowLeft} from "lucide-react";import {useEffect,useState} from "react";import {createClient} from "@/lib/supabase/client";


type A="idle"|"checking"|"available"|"taken"|"invalid";type P="discord"|"github";


export function AuthForm({initialSignup=false}:{initialSignup?:boolean}){
  
 const [mode,setMode]=useState<"login"|"signup">(initialSignup?"signup":"login"),[step,setStep]=useState<"details"|"otp">("details"),[email,setEmail]=useState(""),[username,setUsername]=useState(""),[displayName,setDisplayName]=useState(""),[otp,setOtp]=useState(""),[avail,setAvail]=useState<A>("idle"),[busy,setBusy]=useState(false),[provider,setProvider]=useState<P|null>(null),[msg,setMsg]=useState("");
  
 useEffect(()=>{if(mode!=="signup"||username.length<3){setAvail(username?"invalid":"idle");return}if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){setAvail("invalid");return}setAvail("checking");let live=true;let t=setTimeout(async()=>{let {data,error}=await createClient().from("profiles").select("id").eq("username",username).maybeSingle();if(live)setAvail(error?"idle":data?"taken":"available")},300);return()=>{live=false;clearTimeout(t)}},[username,mode]);
  
 const send=async(e:React.FormEvent)=>{e.preventDefault();setMsg("");if(mode==="signup"&&avail!=="available"){setMsg(avail==="taken"?"そのユーザーIDは既に使われています。別のIDを入力してください。":"使用可能なユーザーIDを入力してください。");return}setBusy(true);let {error}=await createClient().auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:mode==="signup",data:mode==="signup"?{username,display_name:displayName.trim()||username}:undefined}});setBusy(false);if(error)setMsg(error.message);else{setStep("otp");setMsg(`${email} に6桁の確認コードを送信しました。`)}};
  
 const verify=async(e:React.FormEvent)=>{e.preventDefault();if(otp.length!==6)return;setBusy(true);setMsg("");try{let s=createClient(),v=await s.auth.verifyOtp({email:email.trim(),token:otp,type:"email"});if(v.error)throw v.error;let u=await s.auth.getUser();if(u.error||!u.data.user)throw u.error||new Error("ログイン情報を取得できませんでした。");let p=await s.from("profiles").select("id").eq("id",u.data.user.id).maybeSingle();if(p.error)throw p.error;if(!p.data){let name=username||(typeof u.data.user.user_metadata?.username==="string"?u.data.user.user_metadata.username:`fox_${u.data.user.id.slice(0,12)}`),i=await s.from("profiles").insert({id:u.data.user.id,username:name,display_name:(displayName||u.data.user.user_metadata?.display_name||"きつね").trim(),bio:""});if(i.error)throw i.error}location.assign("/")}catch(x){setMsg(x instanceof Error&&x.message.includes("duplicate")?"そのユーザーIDは既に使われています。別のIDを選んでください。":x instanceof Error?x.message:"ログインに失敗しました")}finally{setBusy(false)}};
  
 const oauth=async(p:P)=>{setProvider(p);let {error}=await createClient().auth.signInWithOAuth({provider:p,options:{redirectTo:`${location.origin}/auth/callback`}});if(error){setMsg(error.message);setProvider(null)}};
  
 const state=avail==="taken"?<small className="status-bad">既に使</small>










用されています！</small>:avail==="available"?<small className="status-good">使用可能です！</small>:avail==="checking"?<small className="helper">確認中...</small>:avail==="invalid"?<small className="status-bad">3〜20文字の半角英数字と _</small>:null;
 return <main className="page-wrap auth-page"><section className="panel auth-card"><div className="auth-emblem"><Sparkles/></div>{step==="details"?<><h1 className="page-heading">{mode==="signup"?"きつね村に参加":"おかえりなさい"}</h1><p className="page-subtitle">メールアドレスに届く6桁コード、またはDiscord・GitHubでログインできます。</p><form onSubmit={send}>{mode==="signup"&&<><label>ユーザーID<input className="input" value={username} onChange={e=>setUsername(e.target.value.trim().toLowerCase())} required minLength={3} maxLength={20}/>{state}</label><label>表示名<input className="input" value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={40}/></label></>}<label>メールアドレス<input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>{msg&&<p className="notice notice-error">{msg}</p>}<button className="button button-primary" disabled={busy||(mode==="signup"&&avail!=="available")}><Mail size={16}/>{busy?"送信中...":"6桁コードを送る"}</button></form><div className="grid grid-cols-2 gap-3"><button type="button" onClick={()=>void oauth("discord")} disabled={busy||!!provider}>Discord</button><button type="button" onClick={()=>void oauth("github")} disabled={busy||!!provider}><Github size={16}/>GitHub</button></div><p className="helper">{mode==="signup"?"すでにアカウントをお持ちですか？":"はじめての方はこちら"}<button type="button" onClick={()=>{setMode(mode==="signup"?"login":"signup");setMsg("")}}>{mode==="signup"?"ログイン":"新規登録"}</button></p></>:<><button type="button" onClick={()=>setStep("details")}><ArrowLeft size={14}/>入力に戻る</button><h1 className="page-heading">6桁コードを入力</h1><p>{email} に届いたコードを入力してください。</p><form onSubmit={verify}><input className="input" inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} required/>{msg&&<p className="notice notice-error">{msg}</p>}<button className="button button-primary" disabled={busy||otp.length!==6}><KeyRound size={16}/>{busy?"確認中...":"ログイン"}</button></form><button type="button" onClick={()=>void send({preventDefault:()=>{}} as React.FormEvent)} disabled={busy}>コードを再送する</button></>}</section></main>;
}
