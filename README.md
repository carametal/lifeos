# Life OS

生活を記録し、自分で次の改善を決める個人用Webアプリケーション。

正式な開発場所は `/Users/carametal/Dev/lifeos`。Phase 3の認証・DB基盤を実装しました。メール＋パスワードのログイン、ログアウト、サーバー認証、RLS付きDBマイグレーションがあります。リモートDB適用とアカウント作成はまだ必要です。食事CRUDとAI呼び出しは後続です。

## 開発

Node.js 24.x、npmを使用します。2026-09-24にNode 24.14.1で確認。

```sh
npm ci
npm run dev
```

http://localhost:3000 を開きます。環境変数なしの場合は接続準備中の画面になります。Supabaseに接続するには `.env.example` を `.env.local` にコピーし、承認した開発環境の設定のみを入力します。秘密値はGitやチャットに貼り付けません。

```sh
npm run lint
npm run typecheck
npm run build
# 上記をまとめて実行
npm run check
```

## 採用バージョンと依存の目的

2026-09-24に公式Next.js資料・npm安定版を確認し、lockfileに固定しました。

| パッケージ | バージョン | 目的 |
|---|---|---|
| Next.js | 16.3.6 | App Router、サーバー処理 |
| React / React DOM | 19.2.8 | UI |
| TypeScript | 5.9.3 | 型検証 |
| Tailwind CSS | 4.3.3 | スタイル |
| shadcn | 4.21.0 | UI生成とテーマCSS |
| @base-ui/react | 1.8.0 | shadcnのUIプリミティブ |
| class-variance-authority / cn | lockfile参照 | コンポーネントの見た目・クラス結合 |
| tw-animate-css / lucide-react | lockfile参照 | shadcnが導入するアニメーション・アイコン基盤 |

ESLintはNext.js公式生成設定の9系を採用。導入時にサポート終了の警告があるため、互換性を確認した更新が残課題です。Supabase SDK 2.117.1（Auth/DB）、SSR 0.12.7（Cookie連携）、Zod 4.6.5（入力検証）、server-only 0.0.1（サーバー専用コード保護）をPhase 3で追加しました。単体テストはNode標準のテストランナーを使用します。OpenAI SDKは後続です。外部フォント取得は不要です。本実行環境でTurbopackの内部ポート作成が拒否されるため、本番ビルドはNext.js標準のWebpack方式を使用します。

## 設計と次の作業

- [設計・DB・認証・AI・フェーズ計画](docs/phase-1-design.md)
- [作業状況と検証記録](docs/project-status.md)

[Supabase初期設定・アカウント作成・DB適用手順](docs/supabase-setup.md)に沿って設定してください。公開登録をOFFにし、SQLマイグレーションを適用し、管理者が利用アカウントを作成します。通常操作にサービスロールキーは使用しません。

`npm test`で認証入力検証、`npm run test:db`でDocker上のRLS/DB制約を確認します。リモートの接続設定を読み取る場合は `node --env-file=.env.local scripts/check-supabase.mjs` を実行します。

AIは既定で無効。外部環境への接続、DB適用、API課金、公開は実行前に確認します。日次・週次の基本集計までをAIより先に完成させます。

## CI

GitHub Actions用にLint・型チェック・単体テスト・ビルド・ローカルDBテストを設定しました。Phase 2までGitHubにpush済み。Phase 3のリモートCI実行結果は未確認です。
