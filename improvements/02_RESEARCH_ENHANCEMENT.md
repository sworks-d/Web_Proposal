# 02: リサーチ・ファクトチェック強化

## 現状の問題

### AG-01-RESEARCH
- 検索回数制限が15回と厳しい
- 検索クエリ設計のガイダンスが具体性不足
- 信頼度評価が主観的

### AG-05-FACTCHECK
- **web_searchを使った検証をしていない**（最大の問題）
- 前エージェントの出力を論理的に確認するだけ
- 実際の事実確認ができていない

---

## 改善1: AG-01-RESEARCH の強化

### 検索回数の拡張

```markdown
# 変更前
検索回数上限：15回（無駄を避けるため計画してから実行）

# 変更後
検索回数上限：30回
- Phase 1（必須）：基本情報収集 10回
- Phase 2（必須）：業界・競合情報 10回  
- Phase 3（条件付き）：深掘り・検証 10回

検索戦略：
1. 最初に広い検索（業界全体）→ 結果から競合名を特定
2. 特定した競合名で個別検索
3. 数値情報は複数ソースで裏取り
```

### 検索クエリテンプレートの追加

```markdown
## 検索クエリテンプレート（必ず使用すること）

### 企業情報
- "{会社名} IR 決算 {年度}"
- "{会社名} 従業員数 売上高 資本金"
- "{会社名} 会社概要 本社"

### 業界情報
- "{業界名} 市場規模 {年度} 推移"
- "{業界名} シェア ランキング 上位"
- "{業界名} 動向 トレンド {年度}"

### 競合特定
- "{会社名} 競合 比較"
- "{業界名} 主要企業 一覧"
- "{サービス名} 類似サービス 比較"

### 採用案件特有
- "{会社名} 採用 OpenWork 評判"
- "{会社名} 転職 口コミ 年収"
- "{業界名} 採用 難易度 人気企業"

### 検証用
- "{数値情報} {会社名} {年度}" ← 取得した数値を別ソースで確認
```

### 信頼度評価の客観化

```markdown
## 信頼度評価基準（改善版）

### ★★★（High）：断定に使用可
- 出所：IR資料、有価証券報告書、官公庁統計、上場企業の公式発表
- 条件：直近2年以内のデータ
- 複数ソースで一致を確認済み

### ★★（Medium）：根拠付きで使用・注記必要
- 出所：業界誌、日経・東洋経済等のビジネスメディア、調査会社レポート
- 条件：直近3年以内、または「○年時点」と明記
- 単一ソースだが信頼性の高いメディア

### ★（Low）：仮説として明示・要確認
- 出所：企業PR、一般Webサイト、個人ブログ
- 条件：日付不明、または3年以上前
- 複数ソースで確認できていない

### 評価時の必須チェック
□ 出所URLを記録したか
□ データの日付を確認したか
□ 他ソースとのクロスチェックを試みたか
□ 「推定」「約」等の曖昧表現に注意したか
```

---

## 改善2: AG-05-FACTCHECK の抜本的強化

### 現状のプロンプトの問題

現在のAG-05は：
- 前エージェントの出力を「読んで」論理チェックするだけ
- web_searchで実際に事実確認しない
- 「この情報が正しいかどうか」を検証できない

### 新しいプロンプト：AG-05-FACTCHECK-V2

```markdown
# AG-05-FACTCHECK ファクトチェック担当 V2

## Layer 0：このAGが存在する理由

AG-01〜04の出力には「LLMが生成した情報」が含まれている。
これらは訓練データからの推測であり、現在の事実と乖離している可能性がある。

このAGは**web_searchツールを使って実際に事実を確認する**。
「プロンプトで書いてあるから正しい」ではなく「検索して確認したから正しい」状態を作る。

---

## Layer 1：ファクトチェックの3段階

### Stage 1：クリティカル情報の特定（検索なし）

前エージェント出力から「間違っていたら提案全体が崩壊する情報」を抽出：
- 売上高・従業員数・シェア等の定量情報
- 業界順位・ポジション
- 競合企業の特定
- 市場規模・成長率

### Stage 2：Web検索による検証（検索20回上限）

Stage 1で特定した情報を検索して確認：
- 複数ソースで一致するか
- 最新情報と乖離していないか
- 出所が明確か

### Stage 3：矛盾検出と修正提案（検索なし）

検証結果をもとに：
- 確認できた情報 → High評価に昇格
- 確認できなかった情報 → Low評価に降格 + 注記
- 矛盾が発見された情報 → 修正案を提示

---

## Layer 2：検証クエリ設計

### 優先検証対象

1. **数値情報**（売上、従業員数、シェア、市場規模）
   - クエリ："{会社名} {数値の種類} {年度}"
   - 複数ソースで確認必須

2. **業界ポジション**（順位、上位○社）
   - クエリ："{業界名} 売上 ランキング"
   - 順位の根拠を確認

3. **競合情報**（競合として挙げられた企業が妥当か）
   - クエリ："{クライアント名} 競合 比較"
   - 業界内での位置関係を確認

4. **最新性**（情報が古くなっていないか）
   - クエリ："{会社名} ニュース {直近1年}"
   - 大きな変化がないか確認

---

## Layer 3：出力形式

{
  "verificationSummary": {
    "totalItemsChecked": 0,
    "verified": 0,
    "unverified": 0,
    "contradicted": 0,
    "searchesUsed": 0
  },
  
  "verifiedItems": [
    {
      "item": "検証した情報",
      "originalSource": "どのAGの出力か",
      "originalConfidence": "元の信頼度",
      "verificationQuery": "使用した検索クエリ",
      "verificationResult": "検証結果の要約",
      "newConfidence": "high",
      "sources": ["確認したURL/出所"]
    }
  ],
  
  "unverifiedItems": [
    {
      "item": "検証できなかった情報",
      "originalSource": "どのAGの出力か",
      "attemptedQueries": ["試した検索クエリ"],
      "reason": "なぜ検証できなかったか",
      "recommendation": "この情報の扱い方（削除/注記/クライアント確認）"
    }
  ],
  
  "contradictions": [
    {
      "item": "矛盾が発見された情報",
      "originalClaim": "元の記述",
      "actualFinding": "検索で判明した事実",
      "verificationQuery": "使用した検索クエリ",
      "sources": ["確認したURL"],
      "correction": "修正案"
    }
  ],
  
  "crossAgentIssues": [
    {
      "description": "エージェント間の矛盾",
      "agents": ["AG-XX", "AG-YY"],
      "resolution": "どう解決すべきか"
    }
  ],
  
  "overallAssessment": {
    "readyForCreative": true,
    "criticalIssues": ["即対処が必要な問題"],
    "recommendations": ["提案書作成前に対処すべきこと"]
  }
}
```

---

## 改善3: マルチパスファクトチェック

### 現状の問題

AG-05は1回しか実行されない。
しかし複雑な案件では、1回のファクトチェックでは不十分。

### 提案：反復ファクトチェック

```
AG-01〜04 実行
    ↓
AG-05-PASS1（クリティカル情報の検証）
    ↓
修正が必要なら該当AGを再実行
    ↓
AG-05-PASS2（修正後の確認 + 追加検証）
    ↓
問題なければAG-06へ
```

### 実装方法（orchestrator.tsの修正）

```typescript
async function executeWithFactCheck(projectId: string) {
  // Phase 1-4: 通常のエージェント実行
  await executeAgents(['AG-01', 'AG-02', 'AG-03', 'AG-04'])
  
  // Phase 5-Pass1: ファクトチェック
  const factCheckResult = await executeAgent('AG-05')
  
  // 重大な問題があれば再実行
  if (factCheckResult.contradictions.length > 0) {
    const agentsToRerun = identifyAgentsToRerun(factCheckResult)
    await executeAgents(agentsToRerun)
    
    // Phase 5-Pass2: 再ファクトチェック
    await executeAgent('AG-05')
  }
  
  // Phase 6: 設計草案
  await executeAgent('AG-06')
}
```

---

## 改善4: 検索結果のキャッシュ

同じクエリで複数エージェントが検索しないよう、検索結果をDBにキャッシュ。

### スキーマ追加

```prisma
model SearchCache {
  id          String   @id @default(cuid())
  projectId   String
  query       String
  resultJson  String
  retrievedAt DateTime @default(now())
  expiresAt   DateTime // 24時間後等
  
  @@unique([projectId, query])
}
```

### 活用方法

- AG-01-RESEARCHが「{会社名} 売上高」で検索
- 結果をキャッシュ
- AG-05-FACTCHECKが同じクエリで検証 → キャッシュから取得
- コスト削減 + 一貫性確保

---

## 実装チェックリスト

### Phase 1: アーキテクチャ（01_ARCHITECTURE_FIX.md）
- [ ] anthropic-client.tsの修正
- [ ] base-agent.tsの修正
- [ ] 動作確認

### Phase 2: AG-01-RESEARCH強化
- [ ] 検索回数制限を30回に拡張
- [ ] 検索クエリテンプレートを追加
- [ ] 信頼度評価基準を更新

### Phase 3: AG-05-FACTCHECK強化
- [ ] 新プロンプト（V2）に置換
- [ ] web_searchを有効化
- [ ] 出力形式を更新

### Phase 4: マルチパスファクトチェック
- [ ] orchestrator.tsに反復ロジック追加
- [ ] 再実行判定ロジック実装

### Phase 5: 検索キャッシュ
- [ ] Prismaスキーマ追加
- [ ] キャッシュ参照ロジック実装
