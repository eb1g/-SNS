import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, UserRound } from "lucide-react";
import { PostFeed } from "@/components/post-feed";
import { createClient } from "@/lib/supabase/server";
import type { Post, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export async function generateMetadata({params}:{params:Promise<{username:string}>}):Promise<Metadata>{
  const {username}=await params;
  return {title:`@${username} のプロフィール`};
}
export default async function UserPage({params}:{params:Promise<{username:string}>}) {
  const {username}=await params;
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)notFound();
  const supabase=await createClient();
  const {data}=await supabase.from("profiles").select("*,custom_tags(tag_name)").eq("username",username).maybeSingle();
  if(!data)notFound();
  const profile=data as Profile & {custom_tags:{tag_name:string}[]};
  const {data:{user}}=await supabase.auth.getUser();
  const {data:postsData}=await supabase.from("posts").select("id,user_id,content,image_url,created_at,profile:profiles!posts_user_id_fkey(username,display_name,avatar_url,custom_tags(tag_name)),likes(user_id)").eq("user_id",profile.id).order("created_at",{ascending:false}).limit(40);
  return <main className="page-wrap" style={{paddingTop:27,paddingBottom:55}}>
    <section className="panel" style={{overflow:"hidden",marginBottom:22}}>
      <div className="profile-cover" style={profile.banner_url?{backgroundImage:`url("${profile.banner_url}")`}:undefined}/>
      <div className="profile-head"><div className="avatar profile-avatar">{profile.avatar_url?<Image src={profile.avatar_url} alt={`${profile.display_name}のアイコン`} width={104} height={104} unoptimized />:<UserRound size={31}/>}</div>
        <div className="profile-info"><h1>{profile.display_name}{profile.custom_tags?.map((tag)=><span className="tag-badge" style={{marginLeft:7,verticalAlign:"middle"}} key={tag.tag_name}>{tag.tag_name}</span>)}</h1><div className="muted" style={{fontSize:13}}>@{profile.username}</div>
          {profile.bio&&<p className="profile-bio">{profile.bio}</p>}<div className="profile-meta"><CalendarDays size={13} style={{display:"inline",verticalAlign:"-2px",marginRight:5}}/>{new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long"}).format(new Date(profile.created_at))}から参加</div>
        </div>
      </div>
    </section>
    <div className="feed-title">{user?.id===profile.id?"あなたの投稿":"投稿"}</div>
    <PostFeed initialPosts={(postsData??[]) as unknown as Post[]} currentUserId={user?.id??null}/>
  </main>;
}
