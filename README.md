# Life OS

生活を記録し、自分で次の改善を決める個人用Webアプリケーション。

正式な開発場所は `/Users/carametal/Dev/lifeos`。改善方針を承認し、Phase 2の初期構築を実施しました。現在の画面は準備中の案内です。認証・データ保存・AI呼び出しはまだ実装していません。

## 開発

Node.js 24.x、npmを使用します。2026-09-24にNode 24.14.1で確認。

```sh
npm ci
npm run dev
```

http://localhost:3000 を開きます。Phase 2は環境変数なしで起動できます。Phase 3以降は `.env.example` を `.env.local` にコピーし、承認した開発環境の設定のみを入力します。秘密値はGitやチャットに貼り付けません。

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

ESLintはNext.js公式生成設定の9系を採用。導入時にサポート終了の警告があるため、互換性を確認した更新が残課題です。Supabase/OpenAI SDK、テストライブラリは使用するフェーズで追加します。外部フォント取得は不要です。本実行環境でTurbopackの内部ポート作成が拒否されるため、本番ビルドはNext.js標準のWebpack方式を使用します。

## 設計と次の作業

- [設計・DB・認証・AI・フェーズ計画](docs/phase-1-design.md)
- [作業状況と検証記録](docs/project-status.md)

次はPhase 3の認証・DB・RLSです。管理者がSupabaseでアカウントを事前作成し、公開サインアップを無効にする方針です。具体的な作成・復旧・マイグレーション手順は実装時に追記します。未認証で個人データを扱う暫定実装は行いません。

AIは既定で無効。外部環境への接続、DB適用、API課金、公開は実行前に確認します。日次・週次の基本集計までをAIより先に完成させます。

## CI

GitHub Actions用にLint・型チェック・ビルドを設定しました。GitHubへの接続・pushは未実施です。
