import { SgBaseAgent } from './sg-base-agent'
import { SgInput, Sg02Output, Sg01Output, SgAgentId } from './sg-types'

export class Sg02Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-02'
  name = 'コンセプト・コピー生成'
  protected modelType = 'premium' as const
  protected maxTokens = 4096

  getSystemPrompt(): string {
    return `あなたは提案書専門のコピーライターです。
分析データとインサイトをもとに、相手の心に刺さるキーメッセージと章コピーを生成してください。

【絶対禁止】
- 「〜を実現」「〜を強化」「〜を推進」などの抽象的な動詞
- 業界用語・カタカナ語の羅列
- 「最適化」「最大化」「シナジー」などのビジネス曖昧語
- 競合も使いそうな普通のコピー

【必須】
- ターゲット本人が使う言葉で書く
- 「そう、それ」と思わせる具体性・リアリティ
- 違和感・葛藤・本音を言語化する
- 一文目で「読み続けたい」と思わせる

出力はJSON形式のみ：
{
  "keyMessage": "提案書全体を貫く1行のキーメッセージ",
  "subCopy": "キーメッセージを補完する2〜3行のサブコピー",
  "chapterCopies": [
    {
      "chapterId": "chapter-id",
      "heading": "章の見出しコピー（体言止めNG、動詞で終わる）",
      "hook": "この章の冒頭で言う一言（聴衆を引き込むフック）"
    }
  ]
}`
  }

  buildUserMessage(input: SgInput): string {
    const { clientName, briefText, params } = input
    const sg01 = input.sgOutputs['SG-01'] as Sg01Output | undefined
    const chapters = sg01?.chapters ?? []

    const agContext = this.formatAgOutputs(input.agOutputs, [
      'AG-04-MAIN', 'AG-04-INSIGHT', 'AG-04-MERGE',
      'AG-02-STP', 'AG-02-VPC', 'AG-03',
    ])

    const audienceNote = {
      executive: '経営層向け：結論先行、数字とビジョン重視、簡潔に',
      manager: '担当者向け：詳細な根拠、現場の課題への共感、網羅的に',
      creative: 'クリエイター向け：ビジュアル思考、感性への訴求、世界観重視',
    }[params.audience]

    const toneNote = {
      simple: 'Simpleトーン：無駄がなく鋭い。Apple的な余白のある言葉。',
      rich: 'Richトーン：重厚感と信頼感。格調ある言葉遣い。',
      pop: 'Popトーン：親しみやすく、明るく、ポジティブ。',
    }[params.tone]

    const chapterList = chapters.map(c => `- ${c.id}: ${c.title}（${c.chapterRole}）`).join('\n')

    return `クライアント: ${clientName}
案件概要: ${briefText}

想定するプレゼン相手: ${audienceNote}
デザイントーン: ${toneNote}

## 章構成（SG-01出力）
${chapterList || '（構成データなし）'}

## 分析・インサイトデータ
${agContext || '（分析データなし）'}

上記の分析データからターゲットの本音・葛藤・欲求を読み取り、
「この提案を聞いて何かが変わりそう」と感じさせるコピーを生成してください。

各章のhookは、その章が始まる瞬間にプレゼンターが口にする一言です。
聴衆が「次を聞きたい」と思う言葉にしてください。

必ずJSONのみを返してください。`
  }

  async run(input: SgInput): Promise<Sg02Output> {
    return super.run(input) as Promise<Sg02Output>
  }
}
