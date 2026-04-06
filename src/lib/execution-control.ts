/**
 * パイプライン実行の停止フラグ管理
 * versionId → stopRequested のインメモリマップ
 * Next.js のプロセスが同一である間（dev / production）有効
 */

const stopFlags = new Map<string, boolean>()

export function requestStop(versionId: string): void {
  stopFlags.set(versionId, true)
}

export function isStopRequested(versionId: string): boolean {
  return stopFlags.get(versionId) === true
}

export function clearStop(versionId: string): void {
  stopFlags.delete(versionId)
}
