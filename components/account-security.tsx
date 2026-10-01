"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, KeyRound, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccountSecurity({ email }: { email: string }) {
  const [newEmail,setNewEmail] = useState("");
  const [emailCode,setEmailCode] = useState("");
  const [emailStep,setEmailStep] = useState<"request"|"verify">("request");
  const [password,setPassword] = useState("");
  const [factorId,setFactorId] = useState("");
  const [qrUri,setQrUri] = useState("");
  const [factorCode,setFactorCode] = useState("");
  const [hasMfa,setHasMfa] = useState(false);
  const [deleteOpen,setDeleteOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const supabase = createClient();
  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({data}) => setHasMfa(!!data?.totp.some((factor) => factor.status === "verified")));
  }, [supabase]);
  async function requestEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage("");
    const { error } = await supabase.auth.updateUser({email:newEmail});
    setBusy(false);if(error)setMessage(error.message);else {setEmailStep("verify");setMessage(`確認コードを ${newEmail} に送信しました。`);}
  }
  async function verifyEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);
    const { error } = await supabase.auth.verifyOtp({email:newEmail,token:emailCode,type:"email_change"});
    setBusy(false);if(error)setMessage(error.message);else {setMessage("メールアドレスを変更しました。");setEmailStep("request");setNewEmail("");}
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);
    const { error } = await supabase.auth.updateUser({password});
    setBusy(false);if(error)setMessage(error.message);else {setMessage("パスワードを更新しました。");setPassword("");}
  }
  async function enrollMfa() {
    setBusy(true);setMessage("");
    const { data,error } = await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"きつねSNS"});
    setBusy(false);if(error)setMessage(error.message);else if(data.totp){setFactorId(data.id);setQrUri(data.totp.uri);setMessage("認証アプリでQRコードを読み取り、6桁コードを入力してください。");}
  }
  async function verifyMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({factorId,code:factorCode});
    setBusy(false);if(error)setMessage(error.message);else {setHasMfa(true);setQrUri("");setMessage("二段階認証を有効にしました。");}
  }
  async function disableMfa() {
    setBusy(true);const {data}=await supabase.auth.mfa.listFactors();
    const factor=data?.totp.find((item)=>item.status==="verified");
    if(!factor){setBusy(false);setHasMfa(false);setMessage("有効な認証要素がありません。");return;}
    const {error}=await supabase.auth.mfa.unenroll({factorId:factor.id});
    setBusy(false);if(error)setMessage(error.message);else {setHasMfa(false);setMessage("二段階認証を無効にしました。");}
  }
  async function deleteAccount() {
    setBusy(true);setMessage("");
    const response=await fetch("/api/account/delete",{method:"POST"});
    const body=await response.json();setBusy(false);
    if(!response.ok){setMessage(body.error ?? "退会できませんでした。");return;}
    await supabase.auth.signOut();window.location.assign("/");
  }
  return <div>
    <h2 style={{fontSize:18,fontWeight:900,margin:"0 0 4px"}}>アカウントとセキュリティ</h2><p className="page-subtitle">ログイン情報とアカウント保護を管理します。</p>
    <section><h3 style={{fontSize:14}}><Mail size={15} style={{display:"inline",marginRight:6}}/>メールアドレス</h3><p className="helper">現在: {email}</p>
      <form onSubmit={emailStep==="request"?requestEmailChange:verifyEmailChange}>{emailStep==="request"?<div className="field"><label htmlFor="new-email">新しいメールアドレス</label><input className="input" id="new-email" type="email" value={newEmail} onChange={(event)=>setNewEmail(event.target.value)} required /></div>:<div className="field"><label htmlFor="email-code">確認コード</label><input className="input" id="email-code" inputMode="numeric" maxLength={6} value={emailCode} onChange={(event)=>setEmailCode(event.target.value.replace(/\D/g,"").slice(0,6))} required /></div>}<button className="button button-outline" disabled={busy}>{emailStep==="request"?"確認コードを送信":"メール変更を確認"}</button></form>
    </section><div className="section-divider" />
    <section><h3 style={{fontSize:14}}><KeyRound size={15} style={{display:"inline",marginRight:6}}/>パスワード</h3><form onSubmit={changePassword}><div className="field"><label htmlFor="new-password">新しいパスワード</label><input className="input" id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="8文字以上" required /></div><button className="button button-outline" disabled={busy}>パスワードを更新</button></form></section><div className="section-divider" />
    <section><h3 style={{fontSize:14}}><ShieldCheck size={15} style={{display:"inline",marginRight:6}}/>二段階認証（TOTP）</h3><p className="helper">認証アプリを使った6桁コードでアカウントを保護します。</p>
      {qrUri&&<form onSubmit={verifyMfa} style={{display:"grid",justifyItems:"start",gap:12,margin:"13px 0"}}><div style={{background:"white",padding:10,borderRadius:8}}><QRCodeSVG value={qrUri} size={164} /></div><div className="field" style={{width:"100%",maxWidth:250}}><label htmlFor="mfa-code">認証コード</label><input className="input" id="mfa-code" inputMode="numeric" maxLength={6} value={factorCode} onChange={(event)=>setFactorCode(event.target.value.replace(/\D/g,"").slice(0,6))} required /></div><button className="button button-primary" disabled={busy||factorCode.length!==6}>有効化</button></form>}
      {hasMfa?<button className="button button-outline" disabled={busy} onClick={()=>void disableMfa()}>二段階認証を無効化</button>:!qrUri&&<button className="button button-outline" disabled={busy} onClick={()=>void enrollMfa()}>認証アプリを設定</button>}
    </section><div className="section-divider" />
    <section style={{border:"1px solid #f0c8c1",background:"#fff7f5",borderRadius:10,padding:15}}><h3 style={{fontSize:14,color:"#a6382d",marginTop:0}}><AlertTriangle size={15} style={{display:"inline",marginRight:6}}/>退会</h3><p className="helper" style={{marginBottom:12}}>退会するとプロフィール、投稿、いいねなどのデータを削除します。この操作は取り消せません。</p><button className="button button-danger" onClick={()=>setDeleteOpen(true)}><Trash2 size={15}/>退会する</button></section>
    {message&&<p className="notice" role="status" style={{marginTop:15}}>{message}</p>}
    {deleteOpen&&<div role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setDeleteOpen(false);}} style={{position:"fixed",inset:0,zIndex:20,display:"grid",placeItems:"center",padding:20,background:"#221a12a8"}}><section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="panel" style={{width:"min(420px,100%)",padding:23}}><h2 id="delete-title" style={{marginTop:0}}>本当に退会しますか？</h2><p className="helper">プロフィール・投稿・いいねを削除します。この操作は元に戻せません。</p><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><button className="button button-outline" onClick={()=>setDeleteOpen(false)}>キャンセル</button><button className="button button-danger" disabled={busy} onClick={()=>void deleteAccount()}>完全に退会</button></div></section></div>}
  </div>;
}
