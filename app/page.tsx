import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SuspendedPage() {
  return <main className="page-wrap auth-page"><section className="panel auth-card" style={{textAlign:"center"}}><div className="auth-emblem" style={{margin:"0 auto 17px",color:"var(--rose)"}}><ShieldAlert size={24}/></div><h1 className="page-heading">アカウントは一時停止中です</h1><p className="page-subtitle">現在このアカウントでは、きつねSNSをご利用いただけません。心当たりがない場合は管理者へお問い合わせください。</p><Link className="button button-outline" href="/">トップページへ</Link></section></main>;
}
