import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const origin=request.headers.get("origin");
  const requestOrigin=new URL(request.url).origin;
  const configuredOrigin=process.env.NEXT_PUBLIC_SITE_URL?new URL(process.env.NEXT_PUBLIC_SITE_URL).origin:requestOrigin;
  if(!origin||(origin!==requestOrigin&&origin!==configuredOrigin))return NextResponse.json({error:"リクエスト元を確認できません。"},{status:403});
  const session=await createClient();
  const {data:{user}}=await session.auth.getUser();
  if(!user)return NextResponse.json({error:"ログインが必要です。"},{status:401});
  const {data:profile}=await session.from("profiles").select("role").eq("id",user.id).single();
  if(profile?.role!=="admin")return NextResponse.json({error:"管理者権限が必要です。"},{status:403});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)return NextResponse.json({error:"管理APIのサーバー設定がありません。"},{status:503});
  const payload=await request.json() as {action?:string;userId?:string;postId?:string;username?:string;tagName?:string};
  const admin=createSupabaseClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  if(payload.action==="suspend"&&payload.userId&&payload.userId!==user.id) {
    const {data:target}=await admin.from("profiles").select("role,is_suspended").eq("id",payload.userId).maybeSingle();
    if(!target||target.role==="admin")return NextResponse.json({error:"対象ユーザーを変更できません。"},{status:400});
    const {error}=await admin.from("profiles").update({is_suspended:!target.is_suspended}).eq("id",payload.userId);
    if(error)return NextResponse.json({error:error.message},{status:400});
  } else if(payload.action==="delete-post"&&payload.postId) {
    const {data:post}=await admin.from("posts").select("image_url").eq("id",payload.postId).maybeSingle();
    const marker="/storage/v1/object/public/post-images/";
    const imagePath=post?.image_url?.split(marker)[1];
    if(imagePath)await admin.storage.from("post-images").remove([decodeURIComponent(imagePath)]);
    const {error}=await admin.from("posts").delete().eq("id",payload.postId);
    if(error)return NextResponse.json({error:error.message},{status:400});
  } else if(payload.action==="assign-tag"&&payload.username&&payload.tagName?.trim()) {
    const tagName=payload.tagName.trim().slice(0,24);
    const {data:target}=await admin.from("profiles").select("id").eq("username",payload.username).maybeSingle();
    if(!target)return NextResponse.json({error:"ユーザーが見つかりません。"},{status:404});
    const {error}=await admin.from("custom_tags").upsert({user_id:target.id,tag_name:tagName},{onConflict:"user_id,tag_name"});
    if(error)return NextResponse.json({error:error.message},{status:400});
  } else return NextResponse.json({error:"操作内容が正しくありません。"},{status:400});
  return NextResponse.json({ok:true});
}
