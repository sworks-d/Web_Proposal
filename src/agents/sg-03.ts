import { SgBaseAgent } from './sg-base-agent'
import { SgInput, Sg03Output, Sg01Output, SgAgentId } from './sg-types'

export class Sg03Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-03'
  name = 'ストーリー設計'
  protected modelType = 'premium' as const
  protected maxTokens = 4096

  getSystemPrompt(): string {
    return `あなたは提案書の構成作家です。
渡された章リストを「相手が最後まで聞きたくなる流れ」に再設計してください。

【構成原則】
- 冒頭は相手の現状認識・共感から入る（自社紹介・会社概要から始めない）
- 中盤で「意外な視点」「知らなかった事実」を提示して驚きを与える
- 山場は「だからこうすべき」という納得の瞬間
- 締めは「実現した未来」への期待感で終わる

【緩急設計】
- light: シンプルなスライド1〜2枚。感情的なフック
- medium: 3〜4枚。適度な情報量
- heavy: 5枚以上。データ・根拠・詳細を厚く

【避けること】
- 冒頭からのデータ羅列
- 感情の起伏がないフラットな展開
- 結論の先延ばし（中盤以降で明確にする）

出力はJSON形式のみ：
{
  "orderedChapterIds": ["chapter-id-1", "chapter-id-2", ...],
  "pacedChapters": [
    {
      "id": "chapter-id",
      "narrativeRole": "intro|development|climax|close",
      "informationDensity": "light|medium|heavy",
      "openingHook": "この章の冒頭で言う一言（プレゼンターへのメモ）",
      "emotionalTarget": "この章を終えた時に聴衆に感じてほしいこと"
    }
  ],
  "pacingRationale": "この緩急設計にした理由（1〜3文）"
}`
  }

  buildUserMessage(input: SgInput): string {
    const { clientName, params } = input
    const sg01 = input.sgOutputs['SG-01'] as Sg01Output | undefined
    const sg02 = input.sgOutputs['SG-02'] as { keyMessage?: string; subCopy?: string } | undefined

    const chapters = sg01?.chapters ?? []
    const chapterList = chapters
      .map(c => `- ${c.id}: ${c.title}（役割: ${c.chapterRole}、${c.slideCount}枚）`)
      .join('\n')

    const audienceNote = {
      executive: '経営層：意思決定スピードが速い。退屈すると離脱する。最初の3分が勝負。',
      manager: '担当者：細部を気にする。根拠を求める。置いてきぼりにしない。',
      creative: 'クリエイター：世界観に乗れるかどうかで判断する。感性の共鳴が先。',
    }[params.audience]

    return `クライアント: ${clientName}
想定するプレゼン相手: ${audienceNote}

キーメッセージ（SG-02）: ${sg02?.keyMessage ?? '（未設定）'}
サブコピー（SG-02）: ${sg02?.subCopy ?? '（未設定）'}

## 章リスト（SG-01出力）
${chapterList || '（構成データなし）'}

上記の章を最も効果的な順序に並び替え、緩急を設計してください。
章の順序は変更してかまいません（必要であれば）。

各章の「narrativeRole」は提案書全体の中での位置づけです：
- intro: 共感・問題提起（聴衆の現状認識と重ねる）
- development: 展開・根拠（なぜそうなのかを証明する）
- climax: 山場・転換（「だからこうすべき」という納得の瞬間）
- close: 締め・展望（実現した未来への期待）

必ずJSONのみを返してください。`
  }

  async run(input: SgInput): Promise<Sg03Output> {
    return super.run(input) as Promise<Sg03Output>
  }
}
