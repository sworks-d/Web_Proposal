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
    const candidate = text.slice(jsonStart)
    try { return JSON.parse(candidate) } catch {}

    const jsonEnd = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
    if (jsonEnd > jsonStart) {
      try { return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) } catch {}
    }
  }

  // パターン3: そのままパース（前後に余分なものがない場合）
  try { return JSON.parse(text.trim()) } catch {}

  return null
}
