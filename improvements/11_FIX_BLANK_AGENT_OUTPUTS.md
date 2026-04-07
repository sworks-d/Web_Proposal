# 11: AG空出力問題の修正

## 問題

Precisionモードで以下のエージェントが空出力になる:
- AG-02-STP（STPセグメンテーション）
- AG-03（競合特定・ポジション）
- AG-03-HEURISTIC2（ヒューリスティック評価・残競合）
- AG-03-GAP（コンテンツギャップ）

## 原因

### 原因1: previousOutputsの文字数制限が厳しすぎる

**src/agents/base-agent.ts 85行目付近:**

```typescript
let remaining = 500  // ← これが原因
```

AG-03系は前エージェント（AG-01, AG-02）の分析結果を参照する必要があるが、500文字ではほとんど情報が渡らない。

### 原因2: siteUrl / caseType がbuildUserMessageに含まれていない

AG-02, AG-03系はサイトURLや案件種別（新規/リニューアル等）の情報が必要だが、buildUserMessageに含まれていない。

---

## 修正内容

### A. base-agent.ts の buildUserMessage 修正

**src/agents/base-agent.ts**

```typescript
protected buildUserMessage(input: AgentInput): string {
  const ctx = input.projectContext
  const lines = [
    '## 案件情報',
    `クライアント名: ${ctx.clientName}`,
    `業種: ${ctx.clientIndustry ?? '未設定'}`,
    `業界タイプ: ${ctx.industryType}`,
  ]
  
  // siteUrl追加
  if (ctx.siteUrl) {
    lines.push(`現在のサイトURL: ${ctx.siteUrl}`)
  }
  
  // caseType追加
  const caseTypeLabel = ctx.caseType === 'A' ? '新規サイト制作' 
    : ctx.caseType === 'B' ? 'サイトリニューアル'
    : ctx.caseType === 'C' ? '部分改修・機能追加'
    : ctx.caseType === 'D' ? '運用・保守'
    : '未設定'
  lines.push(`案件種別: ${caseTypeLabel}`)
  
  lines.push(`\n依頼内容:\n${ctx.briefText}`)
  
  if (ctx.knownConstraints) {
    lines.push(`\n制約条件:\n${ctx.knownConstraints}`)
  }
  if (ctx.cdNotes) {
    const note = ctx.cdNotes[this.id]
    if (note) {
      lines.push(`\n## CDからの補足情報（${this.id}向け）\n${note}`)
    }
  }
  
  // previousOutputsの制限を大幅に緩和
  if (input.previousOutputs.length > 0) {
    lines.push('\n## 前エージェントの出力サマリー')
    
    // エージェントごとに適切な上限を設定
    const limits: Record<string, number> = {
      'AG-01': 3000,
      'AG-01-RESEARCH': 2000,
      'AG-01-MERGE': 4000,
      'AG-02': 4000,
      'AG-02-JOURNEY': 3000,
      'AG-02-STP': 3000,
      'AG-02-VPC': 3000,
      'AG-02-POSITION': 3000,
      'AG-02-MERGE': 5000,
      'AG-03': 3000,
      'AG-03-DATA': 3000,
      'AG-03-GAP': 3000,
      'AG-03-HEURISTIC': 3000,
      'AG-03-HEURISTIC2': 3000,
      'AG-03-MERGE': 5000,
    }
    
    for (const prev of input.previousOutputs) {
      const limit = limits[prev.agentId] ?? 2000
      let remaining = limit
      
      lines.push(`\n### ${prev.agentId}`)
      for (const s of prev.sections) {
        if (remaining <= 0) break
        const chunk = s.content.slice(0, remaining)
        lines.push(`**${s.title}**\n${chunk}`)
        remaining -= chunk.length
      }
    }
  }
  
  // rerunInstruction対応（差し戻し機能用）
  if (input.rerunInstruction) {
    lines.push('\n' + '═'.repeat(50))
    lines.push('⚠️ 再実行指示（最優先で対応してください）')
    lines.push('═'.repeat(50))
    lines.push(input.rerunInstruction)
    lines.push('═'.repeat(50))
  }
  
  if (input.userInstruction) {
    lines.push(`\n## 追加指示\n${input.userInstruction}`)
  }
  
  return lines.join('\n')
}
```

### B. callSection内のエラーハンドリング強化

**src/agents/base-agent.ts**

callSectionでパースに失敗した場合、空オブジェクトではなくエラー情報を含める:

```typescript
protected async callSection(
  input: AgentInput,
  sectionInstruction: string,
  maxTokens = 6000
): Promise<Record<string, unknown>> {
  const system = this.getPrompt(input.projectContext)
  const user = this.buildUserMessage(input) +
    `\n\n---\n【出力指示（このリクエスト専用）】\n${sectionInstruction}\n指定フィールドのみのJSONを出力すること。説明・前置き・コードフェンス不要。`
  
  try {
    const raw = await callClaude(system, user, this.modelType, maxTokens)
    const parsed = safeParseJson(raw)
    
    if (parsed === null) {
      console.error(`[${this.id}] callSection パース失敗:`, raw.slice(0, 500))
      // パース失敗時はrawTextを保持して後でフォールバック可能に
      return { _parseError: true, _rawText: raw }
    }
    
    return parsed as Record<string, unknown>
  } catch (err) {
    console.error(`[${this.id}] callSection エラー:`, err)
    return { _callError: true, _errorMessage: String(err) }
  }
}
```

### C. 各エージェントのparseOutputでフォールバック強化

**AG-02-STP, AG-03-GAP, AG-03-HEURISTIC2 共通パターン:**

```typescript
async execute(input: AgentInput): Promise<AgentOutput> {
  const [part1, part2] = await Promise.all([
    this.callSection(input, '...', 6000),
    this.callSection(input, '...', 5000),
  ])
  
  // エラーチェック
  if (part1._parseError || part2._parseError) {
    const rawTexts = [
      part1._rawText ?? JSON.stringify(part1),
      part2._rawText ?? JSON.stringify(part2),
    ].join('\n\n---\n\n')
    this.lastRawText = rawTexts
    return this.fallbackOutput(rawTexts)
  }
  
  const merged = { ...part1, ...part2 }
  this.lastRawText = JSON.stringify(merged)
  return this.parseOutput(this.lastRawText)
}
```

### D. AG-03 (COMPETITOR) の修正

AG-03は通常のexecuteを使っているが、parseOutput内で空セクションになる可能性がある。
fallbackOutputを確実に呼ぶようにする:

```typescript
parseOutput(raw: string): AgentOutput {
  try {
    const p = this.parseJSON<Record<string, unknown>>(raw)
    const sections = []
    
    if (p.competitors) sections.push({ /* ... */ })
    if (p.positioningMap) sections.push({ /* ... */ })
    if (p.differentiationOpportunity) sections.push({ /* ... */ })
    
    // 空の場合はrawを表示
    if (sections.length === 0) {
      return {
        agentId: this.id,
        sections: [{ 
          id: 'raw', 
          title: '競合分析結果（構造化失敗）', 
          content: raw.slice(0, 10000), // 十分な長さを確保
          sectionType: 'text', 
          isEditable: true, 
          canRegenerate: true 
        }],
        // ... metadata
      }
    }
    
    return { agentId: this.id, sections, /* ... */ }
  } catch {
    return this.fallbackOutput(raw)
  }
}
```

---

## 実装順序

1. base-agent.ts の buildUserMessage を修正
   - siteUrl, caseType を追加
   - previousOutputs の制限を緩和（エージェントごとの上限設定）
   - rerunInstruction 対応を追加

2. base-agent.ts の callSection を修正
   - パース失敗時のエラー情報保持
   - エラーログ出力

3. AG-02-STP, AG-03-GAP, AG-03-HEURISTIC2 の execute を修正
   - callSection エラー時のフォールバック

4. AG-03 (COMPETITOR) の parseOutput を修正
   - 空セクション時のフォールバック強化

---

## 検証方法

1. Precisionモードで実行
2. AG-02-STP, AG-03, AG-03-HEURISTIC2, AG-03-GAP の出力を確認
3. 空でないこと、または「構造化失敗」としてraw出力が表示されることを確認
