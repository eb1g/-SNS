export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  role: "admin" | "user";
  is_pro: boolean;
  is_suspended: boolean;
  has_posted: boolean;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profile: Pick<Profile, "username" | "display_name" | "avatar_url"> & {
    custom_tags?: { tag_name: string }[];
  };
  likes: { user_id: string }[];
};
