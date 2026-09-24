# Life OS — Phase 1 設計案

作成日: 2026-09-24。状態: 改善方針承認済み。正式開発場所は /Users/carametal/Dev/lifeos。Phase 2を開始。外部サービスは未接続。

## 1. 目的とスコープ

自分の資料・目標・生活記録を根拠に、自分で改善策を決め、実践と振り返りを継続する個人用アプリ。AIは入力と判断の支援を担当し、計算・保存・意思決定の主体にしない。

MVP: 事前作成アカウントのログイン・ログアウト、日本語のモバイル画面、今日のダッシュボード、栄養目標と履歴、食事の手動CRUD、確認・修正を伴うAI栄養推定、日次・週次振り返り。可搬性のためJSONエクスポートも提案する。

対象外: 資料管理、会話型AI相談、改善活動管理、他の生活領域、写真解析、食品マスタ、PWA、通知、共有、公開登録。ダッシュボードのAI相談導線は「準備中」と明示し、有効な会話機能と誤認させない。推定への導線は別に提供する。

## 2. アーキテクチャと判断

単一のNext.js App RouterアプリをVercelに配置。TypeScript、Tailwind CSS、shadcn/uiを使用。Server Componentsで読み取り、Server Actionsでフォーム更新、Route HandlersでAI推定とエクスポート。DB・AuthはSupabase。認証・認可・入力検証はそれぞれのサーバー入口で実施する。

ブラウザ → Next.js → 利用者JWT付きSupabaseクライアント → PostgreSQL/RLS。
AI推定のみ Next.js → OpenAI Responses API。ブラウザにOpenAIキーを渡さない。

独立APIサーバー、ORM、汎用リポジトリ層、ベクトルDB、ジョブ基盤は導入しない。Supabase生成型とSQLマイグレーションで足りる。運動・睡眠は将来それぞれ専用テーブル・機能ディレクトリとして追加し、今から汎用生活ログJSONテーブルに統合しない。

依存候補と理由: @supabase/supabase-js（DB/Auth）、@supabase/ssr（SSRのCookie連携）、openai（APIと構造化応答）、zod（入力・AI応答の共通検証）、server-only（サーバー専用コードの混入防止）。テスト用はVitestとPlaywrightを必要な段階で導入。グラフは最初はHTML/CSS/SVGで実現し、大きなチャートライブラリは保留。

実装開始時に公式リリース・互換性・セキュリティ情報を確認し、安定版を選択する。Next.js/React/Node.jsの組み合わせと選定日をREADMEに記載し、lockfileをコミットする。本設計では具体的なバージョンやAIモデルを未確定とする。

```text
src/
  app/
    (auth)/login/
    (private)/                 # dashboard, food, goals, reviews, settings
    api/nutrition/estimate/
    api/export/
  components/ui/              # shadcn/ui
  features/
    food/                     # components, actions, queries, schema
    nutrition/                # goals, deterministic aggregation
  lib/
    auth/                     # requireUser
    supabase/                 # server/browser clients, generated types
    ai/                       # estimator, schema, budget
    dates/                    # Asia/Tokyo boundaries
supabase/migrations/
tests/                        # unit, DB/RLS, E2E
docs/
```

## 3. 初期DB案

UUIDを主キーに使用。栄養値はnumeric、カロリーはkcal、その他はg。作成・更新日時と食事日時はtimestamptz。個人テーブルはRLSを有効化する。

| テーブル | 主な列 | 方針 |
|---|---|---|
| profiles | id → auth.users.id, display_name nullable, timezone, created_at, updated_at | timezoneはMVPではAsia/Tokyo固定。管理者がアカウント作成時に準備 |
| nutrition_goals | id, user_id, effective_from date, revision, calories_kcal, protein_g, fat_g, carbs_g, fiber_g, created_at | 適用日ごとに版を追加し、旧版を保持。値はnullableかつ正数 |
| food_logs | id, user_id, eaten_at, meal_type, content, calories_kcal, protein_g, fat_g, carbs_g, fiber_g, ai_estimate jsonb nullable, created_at, updated_at | 栄養値はnullableかつ非負。保存値は利用者の確認後の値 |
| ai_usage（Phase 5） | id, user_id, request_key, status, input_tokens, output_tokens, estimated_cost, model, created_at | 本文を含めず、利用量と回数制限を管理 |

nutrition_goalsは(user_id, effective_from, revision)を一意にする。同じ適用日の訂正も新しい版として追加し、更新・削除で旧版を消さない。対象日以前の最新適用日、その日の最大revisionを選ぶ。同日付の並列保存はトランザクションで採番する。過去日への適用は比較結果が変わることを表示し、利用者に確認する。過去の値は監査可能だが、通常の表示は最新の訂正を反映する。

food_logsは(user_id, eaten_at)に索引。meal_typeはbreakfast/lunch/dinner/snack。ai_estimateには推定時の本文・値・前提・不確実性・モデル・日時・スキーマ版を保存する。食事保存時にだけ原本を同時保存し、未採用の推定はDBに残さない。最終値との差で修正を表示する。本文編集後は古い推定であることを明示する。このJSONは利用者データであり、改ざん不能な監査証跡や課金根拠ではない。独立ai_estimatesテーブルと30日削除処理は導入しない。

食事削除時は付属の推定も削除する。利用量台帳は別に残す。ai_usageを利用者が直接更新・削除できないようにし、通常のCRUDにサービスロールキーを使わない。台帳のサーバー書き込み権限はPhase 5でレビューする。

## 4. 日付・集計の意味

- 入力はAsia/Tokyoとして解釈し、UTCの瞬間として保存。取得範囲はJSTの開始以上・翌日開始未満。端末のタイムゾーンに依存させない。
- 週は月曜開始の日曜終了案。対象日の目標でその日の達成率を計算する。
- 記録なしの日は平均の分母から除外。記録がある日でも1食だけの場合があるため「記録された摂取量の平均」「記録のあるN日」を表示し、完全な摂取量とは断定しない。日単位の記録完了マークは必要性を見て追加し、MVPでは必須にしない。
- 栄養値のnullは不明、0はゼロと区別する。どれかの食事で対象栄養素が不明なら、その日の当該栄養素は「既知分の合計・一部不明」とする。
- 週平均は栄養素ごとに全記録の値が揃った日だけで算出し、対象日数を併記。該当日がなければ未算出。未設定目標の達成率は表示しない。
- 週達成率は対象日が共通の「摂取量合計 ÷ 当日目標の合計」。平均摂取量と対象日が異なる場合は別に日数を表示。
- 丸めは表示時のみ。合計、平均、日付境界、目標選択は純粋関数で実装しテストする。

## 5. 認証・認可と安全性

メール＋パスワードを第一案とし、管理者がSupabase管理画面で利用者を作成する。アプリに登録画面を置かず、Supabase側でも公開サインアップを無効化する。パスワード復旧はMVPでは管理者経由、セルフサービス復旧は後続案。

Supabase SSRに沿ってCookieを連携し、各Server Action/Route Handler/データ取得でサーバー側の認証検証を行う。画面リダイレクトやセッションCookieの存在のみを認可根拠にしない。ログアウトでセッションと端末の下書きを消去する。

所有者チェックはSELECT/DELETEのUSING、INSERTのWITH CHECK、UPDATEの両方でauth.uid() = user_idを要求する。user_idはサーバーが付与し、更新による所有者変更も拒否する。匿名アクセスは拒否。DB関数は既定をSECURITY INVOKERとし、特権関数には固定search_pathと明示的権限を設定する。

認証済みレスポンスを共有キャッシュに入れない。変更・AIルートは同一オリジン検証を行い、GETで変更しない。入力量・数値範囲はサーバーとDBで検証する。個人情報やJWT、本文をログに残さない。入力をHTMLとして描画しない。ログイン・AIエンドポイントに頻度制限を設ける。

.env.exampleには値なしでSupabase URL/publishable key、OpenAIキーとモデル、AI有効化・日次回数・月次予算・最大入力/出力の設定を列挙する。OpenAIキーやDBパスワードはNEXT_PUBLIC_を付けない。公開Supabaseキーは秘密ではないためRLSを安全性の根拠にする。実際の秘密値をチャット・Git・クライアントコードに書かない。

開発用と本番用のデータ・秘密情報を分離。Previewに本番DBの秘密情報を渡さない。実データをfixtureに使わない。JSON出力は自分のデータのみ・スキーマ版付きとし、復元手順を運用文書に残す。無料枠のバックアップ保証を前提にしない。

## 6. AI推定・コスト

明示的な「AIで推定」操作のみ呼び出す。送信範囲は入力中の食事内容に限定し、目標や過去の記録は送らない。送信先と範囲をUIに表示する。

Responses APIのStructured OutputsとZodで検証する。栄養素はnumber|null、前提、分量不明、信頼度、追加質問、needs_clarificationを返す。構造が正しくても栄養の正確性は保証されない。拒否・不完全応答・タイムアウト・範囲外の値は失敗として処理する。推定結果は画面に保持し、利用者の保存操作で確認後の値と原本を同じ食事レコードに保存する。

不確実性が高ければ追加質問を提示し、不明をゼロで補わない。補足入力からの再推定も明示操作。AI障害・予算超過でも手動入力を常に利用可能にする。

store:falseを指定する案。ただし、これだけで全ての保持がゼロになるとは説明しない。OpenAI側の保持・不正利用監視の扱いは導入時に再確認し、送信前の説明に記載する。

モデルはOPENAI_MODELで切替可能。安価で構造化出力に対応する候補をPhase 5で公式価格と評価用の食事例で比較する。現時点でモデル名や月額を確定しない。

概算予算管理を採用する。サーバー側で日次回数、入力文字数、最大出力トークン数、月次概算費用を制限する。DBで呼び出し枠を原子的に取得し、同じ利用者の同時実行を制限する。request_keyで重複を抑止し、自動再試行は既定で無効。使用トークンから概算費用を記録する。結果不明のタイムアウトを無料扱いせず、回数枠を消費済みとして扱う。台帳が利用できなければAIを停止する。月額は請求額の厳密な上限を保証しない。厳密な費用予約・精算・単価版管理は必要になった時点で追加する。

AI予算は承認まで無効。例として月額上限と1日回数を相談し、入力文字数とmax_output_tokensも制限する。ChatGPT契約とは別のAPI課金が発生する前提。Vercel Hobby/Supabase Freeも無制限ではなく、使用量・休止条件・バックアップ等の制限をデプロイ前に再確認する。無料で継続できることは保証しない。

## 7. UIと下書き

日本語、モバイルファースト。今日・記録追加・振り返り・設定に絞る。操作領域は44px以上を目安にし、iPhoneのセーフエリアを考慮。数字に単位を付け、達成率は色だけに依存しない。カロリー超過を機械的に良し悪しと評価しない。

保存中の重複送信防止、成功通知、再試行可能なエラー、削除確認を用意。下書きは利用者ID単位のsessionStorageを基本とする。本人専用端末では、明示的に有効化した場合のみ有効期限付きlocalStorage保存を選べる。保存・ログアウト・期限切れで削除し、読み込み時に所有者と期限を検証する。端末に平文保存されることを説明する。永続保存は既定で無効。iPhoneで中断・再起動時の復元を検証する。端末をまたぐ復元はMVP外。

## 8. 作業計画と完了条件

| Phase | 作業 | 主な検証・完了条件 |
|---|---|---|
| 1 | 要件、設計、未決事項を文書化 | ユーザーが設計とスコープを承認 |
| 2 | Next.js/TS/Tailwind/shadcn、環境変数例、README、CI | 開発起動、Lint、型チェック、build |
| 3 | Supabase Auth、マイグレーション、RLS | 匿名・本人・別ユーザーの直接API操作、所有者変更拒否、ログアウト |
| 4 | 目標履歴、手動食事CRUD、ダッシュボード、下書き、日次・週次の基本集計 | AIキーなしで利用可能。JST境界、null、編集・削除、当時の目標のテスト |
| 5 | 推定API、確認画面、原本・利用量、予算制御 | 不正応答・拒否・障害・並列予算・重複送信。実APIは承認後に少数評価 |
| 6 | 振り返り画面の改善、推移、JSONエクスポート | 未記録日除外、欠損、目標変更、分母、出力所有者の検証 |
| 7 | 本番設定とVercel公開、運用README | iPhoneでログイン→手動記録→推定確認→振り返り。バックアップ/復元確認 |

改善案によるPhase 2着手は承認済み。段階ごとに実装・検証結果を報告する。外部サービス接続、プロジェクト作成、DB適用、課金操作、デプロイは実行前に確認する。依存追加理由と変更内容、検証結果、未実行理由を各段階で報告する。

開発手順案: 正式作業フォルダ確定 → Node/npmと安定版の決定 → 初期化 → ローカル環境変数 → ローカルSupabase（Dockerが利用可能なら） → マイグレーションと型生成 → テスト → 承認された外部環境へ反映。

本番手順案: private GitHubリポジトリ → Supabaseリージョン・公開登録無効化 → マイグレーション → 管理画面で利用者とprofileを作成 → Vercel環境変数 → AuthのSite URL/許可redirect URL設定 → 検証 → 公開。既存サービスの有無を先に確認する。READMEに具体的な実行コマンドを実装と共に追加する。

## 9. 決定事項と後続の確認

- 2026-09-24: 改善方針での進行を承認。開発先は /Users/carametal/Dev/lifeos に確定。
- 手動記録と基本集計を先に完成させ、AIは入力補助として追加する。
- 目標は適用日と版を分離。推定原本は食事JSONにまとめ、予算は概算管理。
- 初期設定: メール＋パスワード、JST、月曜開始。端末への永続下書き保存はオプトイン。
- Phase 3前: Supabaseの既存環境・管理者アカウント作成・接続先を確認する。
- Phase 5前: 食事本文の送信、月額予算、日次回数、実API評価の許可を確認する。それまではAI無効。
- Phase 7前: GitHub/Vercel接続先、公開、バックアップ運用を確認する。

## 10. 公式参照

2026-09-24に閲覧。構成の参考であり、料金・バージョンは実装時に再確認する。

- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase料金: https://supabase.com/pricing
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAIデータ管理: https://developers.openai.com/api/docs/guides/your-data
