# きつねSNS

Next.js App Router、Tailwind CSS、Supabase を使ったきつね好き向けSNSです。本番URLは `https://kitsunesns.f5.si` を想定しています。

## 起動

Node.js 20.9 以降をインストールした環境で実行します。

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

`.env.local` にSupabaseのProject URL、公開可能な anon key、サーバー専用の service_role keyを設定します。`SUPABASE_SERVICE_ROLE_KEY` はブラウザーに公開せず、`NEXT_PUBLIC_` を付けないでください。

## Supabaseの初期設定

1. Supabaseプロジェクトを作成し、SQL Editorで [`supabase/schema.sql`](supabase/schema.sql) を一度実行します。profiles / posts / likes / custom_tags、RLS、画像バケット、Realtime設定が作成されます。
2. AuthenticationのEmailプロバイダーを有効にし、Email OTPの長さを **6桁** に設定します。メールテンプレートには `{{ .Token }}` を使用してください。`supabase/config.toml` の `otp_length = 6` はSupabase CLIでローカル開発するときの設定です。ホステッド環境ではDashboard側にも同じ設定が必要です。
3. AuthenticationのSite URLを `https://kitsunesns.f5.si` に設定し、Redirect URLsに `http://localhost:3000` と `https://kitsunesns.f5.si` を登録します。
4. Storageの `avatars`、`banners`、`post-images` バケットはSQLで作成されます。公開読み取りと、ログイン中ユーザーが自分のフォルダーにだけアップロード・削除できるポリシーも適用されます。
5. 最初の管理者は、登録後にSQL Editorから明示的に指定します。

```sql
update public.profiles set role = 'admin' where username = 'your_username';
```

`role`、凍結状態、Pro状態の変更権限はブラウザーには付与されません。管理APIのキーをサーバー環境変数にだけ登録してください。

## 実装範囲

- Email OTPでの登録・ログイン、ユーザーIDの入力中重複確認、初投稿前のウェルカム表示
- プロフィールと画像アップロード、公開プロフィール
- 画像付き投稿、降順タイムライン、Realtime更新、重複しない「こんこん！」
- メール変更確認、パスワード変更、TOTP MFA、確認モーダル付き退会
- 管理者限定統計、アカウント凍結・解除、投稿削除、カスタムタグ付与

Pro統計は `profiles.is_pro` の件数を表示します。課金・Pro購入フローは含みません。アカウント凍結ではログイン後の通常ページ利用を止め、RLSでも書き込みを拒否します。

## デプロイ

デプロイ先に `.env.example` の環境変数を設定し、`NEXT_PUBLIC_SITE_URL` を `https://kitsunesns.f5.si` にします。ドメインのDNSとTLS証明書はホスティング側で設定してください。SupabaseのSite URL / Redirect URLsも本番ドメインに合わせます。
