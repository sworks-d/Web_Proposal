/**
 * Claude APIが返すテキストからJSONを安全に抽出する
 * - ```json ... ``` コードフェンスを除去
 * - 先頭・末尾の余分なテキストを除去
 * - パース失敗時は null を返す（例外を投げない）
 */
export function safeParseJson(text: string): any | null {
  if (!text) return null

  // パターン1: ```json ... ``` 形式
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }

  // パターン2: { または [ で始まる部分を抽出
  const jsonStart = text.search(/[\[{]/)
  if (jsonStart !== -1) {
    let candidate = text.slice(jsonStart)

    // 終了位置を探す
    const jsonEnd = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'))
    if (jsonEnd > 0) {
      candidate = candidate.slice(0, jsonEnd + 1)
    }

    try { return JSON.parse(candidate) } catch {}

    // 閉じカッコ補完を試みる
    const openBraces = (candidate.match(/{/g) || []).length
    const closeBraces = (candidate.match(/}/g) || []).length
    const openBrackets = (candidate.match(/\[/g) || []).length
    const closeBrackets = (candidate.match(/]/g) || []).length

    let repaired = candidate
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']'
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}'
    }

    try { return JSON.parse(repaired) } catch {}
  }

  // パターン3: そのままパース
  try { return JSON.parse(text.trim()) } catch {}

  return null
}
