# Supabase 初期設定

状態: アプリの実装とローカルDB検証は完了。ホスト側のDB適用と利用アカウント作成はユーザーから完了報告あり。パスワード再設定後、実アカウントでのログイン・ログアウト成功をユーザーが確認。

## 1. 公開登録を無効にする

Supabase管理画面で対象プロジェクトを開き、Authentication → Sign In / Providers の「Allow new users to sign up」をOFFにして保存します。UIが異なる場合はAuthenticationの設定からSignupを探してください。EmailでのサインインはON、Anonymous Sign-insはOFFにします。

公開設定APIの再確認で、Emailは有効、匿名ログインは無効、公開登録は無効になったことを確認済み。

設定の読み取り確認（変更はしません）:

```sh
node --env-file=.env.local scripts/check-supabase.mjs
```

期待値: `Public signup disabled: true`、`Email login enabled: true`、`Anonymous login enabled: false`。

## 2. DBマイグレーション

対象ファイル: `supabase/migrations/202609260001_initial_schema.sql`。

この変更はprofiles・nutrition_goals・food_logsを新規作成し、権限・RLS・目標履歴採番・profile自動作成トリガーを設定します。既存のテーブルやデータを削除するSQLは含めていません。AI用の列と利用量台帳はPhase 5で追加します。

リモートに適用する前に対象プロジェクトと変更内容を確認します。Publishable keyではDDLは実行できません。Secret/service role keyをアプリへ追加して解決することはしません。

最初の適用方法:

1. 対象プロジェクトのSQL Editorで新しいクエリを開く。
2. 上記ファイルの内容全体を貼り付け、対象が開発用プロジェクトであることを確認する。
3. Runを押し、成功を確認する。トランザクションなので途中で失敗した場合は変更がロールバックされる。
4. Table Editorで3テーブルがあり、RLSが有効なことを確認する。

SQL Editorからの適用はCLIのmigration履歴には自動登録されません。適用日時とファイル名をこの文書に記録してください。後でCLI管理に移行するときは、実スキーマが一致することを確認したうえでmigration履歴をrepairします。同じファイルを再実行したり、先にdb pushしたりしないでください。

適用記録: ユーザーから202609260001_initial_schema.sqlの実行成功の報告あり。CLI migration履歴への登録は未実施。

## 3. 利用アカウントの作成

1. Authentication → Users → Add user → Create new userを開く。
2. 自分のメールアドレスと強い固有パスワードを入力する。本人が管理するアドレスであることを確認した上でAuto Confirm Userを有効にする。
3. 作成する。公開登録OFFでも管理者による作成は可能。
4. profilesに同じユーザーIDの行が自動作成されていることを確認する。マイグレーション前に作成済みのユーザーは適用時に補完される。

パスワードはチャットやGitに保存しません。管理者による復旧は、権限を持つ管理者が別の安全な管理環境でAuth Admin APIのupdateUserByIdを使用する方針です。アプリに管理キーを置きません。メールによるセルフサービス復旧はまだ実装していないため、現時点ではリセットメールの導線をアプリに追加しません。

## 4. 接続と動作確認

`.env.local`にはProject URLとPublishable keyだけを設定済み。Gitでは無視されます。`.env.example`に実値を入れないでください。

```sh
npm run dev
```

表示されたローカルURLを開き、作成したアカウントでログインします。トップに「記録用のデータベースに接続できています」と出ればprofileの読み取りまで成功しています。

- 未ログインのトップアクセス → /login。
- 正しい資格情報 → トップ。
- 間違った資格情報 → アカウントの有無を特定しないエラー。
- 開発環境のみ、失敗時に「確認コード」とHTTPステータスを表示する。原因調査にはこのコードだけを共有し、パスワードやセッショントークンは共有しない。本番では詳細コードを表示しない。
- ログアウト → /login。再びトップにアクセスしても個人データが表示されない。
- ホスト側の直接API検証は、開発用の2アカウントで本人/他人/匿名を検証する。現時点では未実施。

ログイン頻度制限にはSupabase Authの制限を使用し、429を画面に表示します。公開前にAuthenticationのRate Limitsを確認し、必要ならCAPTCHAを追加します。サーバーメモリだけの疑似レート制限は導入しません。

## 5. ローカル検証

### 管理者によるパスワード再設定

ユーザー承認済みの復旧用コマンド: `python3 scripts/reset-password.py`。

Supabase管理画面のSettings → API KeysでSecret key（sb_secret_…）、Authentication → Usersで対象ユーザーのUIDを確認する。キーはチャットや.env.localへ貼り付けず、このコマンドの非表示プロンプトにだけ入力する。接続先は.env.localのHTTPS Supabaseプロジェクトに限定する。

UID、対象メール、管理キー、新しいパスワード（12文字以上・UTF-8で72バイト以下）、確認用パスワードを入力し、対象表示を確認してRESETと入力する。getUserByIdでメールの一致を確認した場合だけ、公式Admin APIのupdateUserByIdでpasswordだけを変更する。ユーザーを削除・再作成せず、確認済み状態・権限・プロフィールは変更しない。キーとパスワードは標準入力で子プロセスへ渡し、コマンド引数やファイルには保存しない。

PASSWORD_UPDATEDが出たら、新しいパスワードでアプリにログインする。タイムアウト等の場合は成功している可能性があるため、再実行の前に新しいパスワードで確認する。ユーザー自身が再設定を実行し、その後のログイン・ログアウト成功を報告済み。モックテストで別メールへの変更拒否・passwordだけの更新・秘密を含まない出力を検証済み。

公式資料: [Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)、[API keys](https://supabase.com/docs/guides/getting-started/api-keys)。

### invalid_credentialsの切り分け

アカウントの確認済み状態・パスワード登録・email identityが正常でも、入力した資格情報が一致することまでは確認できません。アプリのフォームを経由しない確認には、本人がターミナルで次を実行します。

```sh
python3 scripts/check-login.py
```

メールとパスワードを対話入力します。パスワードは非表示で、コマンド履歴・ファイル・診断出力には残しません。資格情報は.env.localのSupabase接続先へ送信されます。成功時は診断用セッションをログアウトします。表示されたResult/Code/HTTPだけを共有してください。LOGIN_OK_LOGGED_OUTならフォーム・サーバー処理側を調査し、LOGIN_FAILEDでinvalid_credentialsならアプリ外でも同じ資格情報が拒否されています。

診断スクリプトは構文・Lint確認済み。本人の資格情報を使う実行は本人による操作待ちです。

```sh
npm run check
npm run test:db
```

DBテストはDocker上の一時PostgreSQL 16.1を使います。ホストのポートを公開せず、外部ネットワークも無効化し、終了後に破棄します。Supabaseのauth.uid()とauth.usersの最小契約を再現してRLSと制約を検証します。ホスト側のAuth、PostgREST、設定やログイン成功を検証するものではありません。

## 参照

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
