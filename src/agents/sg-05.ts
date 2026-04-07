import { SgBaseAgent } from './sg-base-agent'
import { SgInput, Sg05Output, Sg04Output, Sg03Output, SgAgentId } from './sg-types'

export class Sg05Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-05'
  name = 'ビジュアル指示'
  protected modelType = 'fast' as const
  protected maxTokens = 4096

  getSystemPrompt(): string {
    return `あなたは提案書のビジュアルディレクターです。
各スライドの内容に最適なビジュアル方針を指示してください。

visualTypeの選択基準：
- none: テキストのみで伝わる場合
- photo: 場の雰囲気・世界観を伝えたい場合
- chart: 数値比較・推移・シェアを示す場合
- diagram: フロー・構造・関係性を整理する場合
- icon: シンプルなカテゴリ分類・リスト強調
- screenshot: Webサイト・UIの実例を見せる場合

layoutSuggestionの例：
- "full-bleed-image": 画像全面
- "left-text-right-image": 左テキスト右画像
- "two-column": 2カラム比較
- "center-message": 中央1メッセージ
- "data-hero": 大きな数字を中央に
- "bullet-list": 箇条書きリスト
- "flow-diagram": フロー図

出力はJSON形式のみ：
{
  "slideVisuals": [
    {
      "slotId": "slot-id",
      "visualType": "none|photo|chart|diagram|icon|screenshot",
      "direction": "ビジュアルの具体的な内容指示（20〜50字）",
      "layoutSuggestion": "レイアウトパターン名"
    }
  ]
}`
  }

  buildUserMessage(input: SgInput): string {
    const { params } = input
    const sg04 = input.sgOutputs['SG-04'] as Sg04Output | undefined
    const sg03 = input.sgOutputs['SG-03'] as Sg03Output | undefined

    const toneNote = {
      simple: 'Simple（Apple系）: 写真大きめ・テキスト少・余白重視',
      rich: 'Rich（FAS系）: 情報量多め・図解多用・ダーク系',
      pop: 'Pop（東組系）: イラスト・アイコン多用・賑やか',
    }[params.tone]

    const densityMap = Object.fromEntries(
      (sg03?.pacedChapters ?? []).map(p => [p.id, p.informationDensity])
    )

    const slideList = (sg04?.slides ?? [])
      .map(s => {
        const density = densityMap[s.chapterId] ?? 'medium'
        return `[${s.slotId}] "${s.title}" | 本文: ${s.body.slice(0, 2).join(' / ')} | 密度: ${density}`
      })
      .join('\n')

    return `デザイントーン: ${toneNote}

## 各スライドの内容
${slideList || '（コンテンツデータなし）'}

各スライドに最適なビジュアル方針を指示してください。
density=heavyのスライドはdiagram/chartを積極的に使ってください。
density=lightのスライドはcenter-messageやfull-bleed-imageを優先してください。

必ずJSONのみを返してください。`
  }

  async run(input: SgInput): Promise<Sg05Output> {
    return super.run(input) as Promise<Sg05Output>
  }
}
