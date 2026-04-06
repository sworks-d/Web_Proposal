// システム更新履歴
// 新しいエントリは先頭に追加する

export interface ChangelogEntry {
  version: string        // 例: "v0.9.2"
  date: string           // 例: "2026.04.06"
  title: string          // 更新タイトル（1行）
  tags: string[]         // 例: ["AG追加", "UI改善", "バグ修正"]
  items: string[]        // 更新内容（箇条書き）
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.9.2',
    date: '2026.04.06',
    title: 'AG-03競合分析を4層構造に刷新・出力情報量を強化',
    tags: ['AG強化', 'プロンプト'],
    items: [
      'AG-03に「企業競合」だけでなく「ターゲットの意思決定競合」4層を追加（直接/間接/心理的/情報競合）',
      'AG-02-STP / JOURNEY / VPCの出力フィールドを深化。typicalPersona・internalNarrative等を追加',
      'AG-07Cをチャプター単位で4分割し、body_draftの文字数上限を300〜600字に引き上げ',
      'MERGE系AGに重複出力禁止ルールを追加（siteDesignPrinciples 7回生成問題を解消）',
      'バージョン管理UIに作成日時・完了日時・更新概要を表示',
    ],
  },
  {
    version: 'v0.9.1',
    date: '2026.04.03',
    title: 'AG-01リサーチ・AG-02-POSITION・4軸ポジショニングを追加',
    tags: ['新AG', 'プロンプト'],
    items: [
      'AG-01-RESEARCH: web_searchで会社情報を客観収集（売上・シェア・競合・口コミ）',
      'AG-01-MERGE: インテーク申告情報 vs リサーチ結果の矛盾を整理',
      'AG-02-POSITION: エリア×規模・業界×規模・エリア×業界・業界×デジタル成熟度の4軸ポジショニング',
      '数値情報をchartData（scatter/bar/radar）として構造化し、グラフ描画に対応',
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026.04.02',
    title: '全プロンプトを5層構造に統一・並列パイプライン化',
    tags: ['アーキテクチャ', 'プロンプト', 'パフォーマンス'],
    items: [
      'AG-02〜04をサブAG化して並列実行（STP/JOURNEY/VPC/POSITION + MERGE）',
      '全15プロンプトをLayer 0〜5の5層構造に書き直し（存在理由・判断基準・実行タスク・品質基準）',
      'max_tokensをAG別に設定（AG-07C: 16384 / AG-04-MAIN: 8192）',
      'outputJsonをsectionsラッパーなしのrawJSON直接保存に変更',
      'AG-07CをCh.01-02 / Ch.03-04 / Ch.05-06 / サマリーの4分割に変更',
    ],
  },
  {
    version: 'v0.8.0',
    date: '2026.04.01',
    title: '初期リリース：マルチエージェント提案書生成システム',
    tags: ['初回リリース'],
    items: [
      'AG-01（インテーク）〜 AG-07（提案書草案）の7フェーズパイプライン',
      '採用/ブランド/EC/コーポレート/BtoB/キャンペーンの業種別AG対応',
      'チェックポイント・再実行・PDF出力・フィードバック機能',
    ],
  },
]
