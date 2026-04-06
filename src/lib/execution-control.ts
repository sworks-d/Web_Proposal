/**
 * パイプライン実行の停止フラグ管理
 * versionId → stopRequested のインメモリマップ + グローバル停止フラグ
 */

const stopFlags = new Map<string, boolean>()
let globalStop = false

export function requestStop(versionId: string): void {
  stopFlags.set(versionId, true)
}

export function requestStopAll(): void {
  globalStop = true
}

export function isStopRequested(versionId: string): boolean {
  return globalStop || stopFlags.get(versionId) === true
}

export function clearStop(versionId: string): void {
  stopFlags.delete(versionId)
  // グローバル停止は clearStopAll で明示的にリセット
}

export function clearStopAll(): void {
  globalStop = false
  stopFlags.clear()
}
