import { SgBaseAgent } from './sg-base-agent'
import { SgInput, SgFinalOutput, Sg01Output, Sg02Output, Sg03Output, Sg04Output, Sg05Output, SgAgentId, VisualType } from './sg-types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Sg06Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-06'
  name = 'スタイル適用・最終出力'
  protected modelType = 'quality' as const  // Haiku→Sonnet: 空データの補完力が必要
  protected maxTokens = 8192

  getSystemPrompt(): string {
    return loadPrompt('sg-06-assembly')
  }

  buildUserMessage(input: SgInput): string {
    const { clientName, params } = input
    const sg01 = input.sgOutputs['SG-01'] as Sg01Output | undefined
    const sg02 = input.sgOutputs['SG-02'] as Sg02Output | undefined
    const sg03 = input.sgOutputs['SG-03'] as Sg03Output | undefined
    const sg04 = input.sgOutputs['SG-04'] as Sg04Output | undefined
    const sg05 = input.sgOutputs['SG-05'] as Sg05Output | undefined

    const orderedIds = sg03?.orderedChapterIds ?? sg01?.chapters.map(c => c.id) ?? []
    const chapterMap = Object.fromEntries((sg01?.chapters ?? []).map(c => [c.id, c]))
    const pacedMap = Object.fromEntries((sg03?.pacedChapters ?? []).map(p => [p.id, p]))
    const contentMap = Object.fromEntries((sg04?.slides ?? []).map(s => [s.slotId, s]))
    const visualMap = Object.fromEntries((sg05?.slideVisuals ?? []).map(v => [v.slotId, v]))

    // Assemble ordered slots
    const orderedSlots: Array<{
      slotId: string; chapterId: string; narrativeRole: string;
      title: string; body: string[]; notes: string;
      visualType: VisualType; visualDirection: string; layoutHint: string;
    }> = []

    for (const cid of orderedIds) {
      const ch = chapterMap[cid]
      if (!ch) continue
      const paced = pacedMap[cid]
      for (const slot of ch.slots) {
        const content = contentMap[slot.id]
        const visual = visualMap[slot.id]
        orderedSlots.push({
          slotId: slot.id,
          chapterId: cid,
          narrativeRole: paced?.narrativeRole ?? 'development',
          title: content?.title ?? slot.role,
          body: content?.body ?? [slot.purpose],
          notes: content?.notes ?? '',
          visualType: (visual?.visualType ?? 'none') as VisualType,
          visualDirection: visual?.direction ?? '',
          layoutHint: visual?.layoutSuggestion ?? 'bullet-list',
        })
      }
    }

    const assemblyData = JSON.stringify({
      clientName,
      params,
      keyMessage: sg02?.keyMessage ?? '',
      subCopy: sg02?.subCopy ?? '',
      orderedSlots,
    }, null, 2).slice(0, 24000)

    return `以下のデータを統合して最終スライドJSONを生成してください。
トーンと相手に合わせて本文を最終調整してください。

${assemblyData}

slideNumberは1から順番に振ってください。
必ずJSONのみを返してください。`
  }

  async run(input: SgInput): Promise<SgFinalOutput> {
    return super.run(input) as Promise<SgFinalOutput>
  }
}
