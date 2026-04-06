# UIバージョン管理の修正指示

Claude Code はこのファイルを読んで実装してください。
`docs/implementation_next_steps.md` の Task 1〜4 とは独立した修正です。

---

## 背景

バージョン管理UIに「更新概要（changeReason）」と「作成日時・完了日時」を
ドロップダウンで表示したい。

現在、以下のコードを `src/app/projects/[id]/page.tsx` に手動で書き込んだが、
React の state 型と表示ロジックが一部機能していない。
全体を正しく実装し直してください。

---

## Task UI-1: VersionSummary インターフェースの更新

### 対象ファイル
`src/app/projects/[id]/page.tsx`

### 変更内容
```typescript
// 変更前
interface VersionSummary {
  id: string
  versionNumber: number
  label: string | null
  status: string
}

// 変更後
interface VersionSummary {
  id: string
  versionNumber: number
  label: string | null
  status: string
  changeReason: string | null
  createdAt: string
  completedAt: string | null
}
```

---

## Task UI-2: getVersionHistory を軽量な select に変更

### 対象ファイル
`src/lib/version-manager.ts`

### 変更内容
```typescript
// 変更前（include で全データを取得していた）
export async function getVersionHistory(projectId: string) {
  return prisma.proposalVersion.findMany({
    where: { projectId },
    orderBy: { versionNumber: 'asc' },
    include: {
      executions: { include: { results: true }, orderBy: { startedAt: 'asc' } },
      slides: { orderBy: { slideNumber: 'asc' } },
      parentVersion: { select: { versionNumber: true, label: true } },
    },
  })
}

// 変更後（VersionSummary に必要なフィールドのみ）
export async function getVersionHistory(projectId: string) {
  return prisma.proposalVersion.findMany({
    where: { projectId },
    orderBy: { versionNumber: 'asc' },
    select: {
      id: true,
      versionNumber: true,
      label: true,
      status: true,
      changeReason: true,
      createdAt: true,
      completedAt: true,
    },
  })
}
```

---

## Task UI-3: バージョンドロップダウンの UI 改修

### 対象ファイル
`src/app/projects/[id]/page.tsx`

### 追加するユーティリティ関数
コンポーネント定義の外（上部）に追加する：

```typescript
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${day} ${h}:${m}`
}
```

### ドロップダウンの表示変更

バージョン一覧の各ボタンを以下の3行構造に変更する：

```
行1：v1  初回提案                    [COMPLETED]
行2：更新概要テキスト（changeReasonがある場合のみ表示）
行3：作成 2026/04/01 16:34    完了 2026/04/02 07:47
```

実装例：
```tsx
{[...versions].reverse().map(v => (
  <button
    key={v.id}
    onClick={() => { setCurrentVersionId(v.id); setShowVersionDropdown(false) }}
    style={{
      width: '100%',
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      padding: '12px 14px',
      background: v.id === currentVersionId ? 'var(--bg2)' : 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--line)',
      fontFamily: 'var(--font-c)',
      color: 'var(--ink)',
      cursor: 'pointer',
    }}
  >
    {/* 行1：バージョン番号 + ラベル + ステータス */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-d)', letterSpacing: '0.04em' }}>
        v{v.versionNumber}
        {v.label && (
          <span style={{ marginLeft: '6px', fontWeight: 400, fontSize: '11px' }}>{v.label}</span>
        )}
      </span>
      <span style={{ fontSize: '9px', color: statusColor(v.status), fontFamily: 'var(--font-d)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {statusLabel(v.status)}
      </span>
    </div>
    {/* 行2：更新概要 */}
    {v.changeReason && (
      <div style={{
        fontSize: '11px',
        color: 'var(--ink2)',
        lineHeight: 1.4,
        maxWidth: '280px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {v.changeReason}
      </div>
    )}
    {/* 行3：日時 */}
    <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--ink2)' }}>
      <span>作成 {formatDate(v.createdAt)}</span>
      {v.completedAt && <span>完了 {formatDate(v.completedAt)}</span>}
    </div>
  </button>
))}
```

### ドロップダウンの幅変更
```typescript
// 変更前
minWidth: '220px'

// 変更後
minWidth: '320px'
```

---

## Task UI-4: 「+ このバージョンを更新」ボタンの改修

現状はクリックしても `setShowVersionDropdown(false)` しか実行しない。
テキスト入力 → POST してバージョン作成まで動くように修正する。

```tsx
<div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
  {/* 概要入力フィールド */}
  <div style={{ marginBottom: '6px' }}>
    <input
      id="change-reason-input"
      type="text"
      placeholder="更新概要（例：競合分析を追加）"
      style={{
        width: '100%',
        padding: '7px 8px',
        fontSize: '11px',
        border: '1px solid var(--line2)',
        fontFamily: 'var(--font-c)',
        color: 'var(--ink)',
        background: 'var(--bg)',
        boxSizing: 'border-box',
      }}
      onKeyDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    />
  </div>
  {/* 更新ボタン */}
  <button
    style={{
      width: '100%',
      background: 'var(--ink)',
      color: 'var(--bg)',
      fontFamily: 'var(--font-d)',
      fontSize: '8px',
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      padding: '9px',
      border: 'none',
      cursor: 'pointer',
    }}
    onClick={async (e) => {
      e.stopPropagation()
      if (!currentVersionId) return
      const input = document.getElementById('change-reason-input') as HTMLInputElement
      const reason = input?.value?.trim() || '手動更新'
      setShowVersionDropdown(false)

      const res = await fetch(`/api/projects/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update',
          parentVersionId: currentVersionId,
          changeReason: reason,
          label: reason.slice(0, 20),
          agentsToRerun: [],
        }),
      })
      if (res.ok) {
        const newVer = await res.json()
        // VersionSummary の形に整形して state に追加
        const summary: VersionSummary = {
          id: newVer.id,
          versionNumber: newVer.versionNumber,
          label: newVer.label ?? null,
          status: newVer.status,
          changeReason: newVer.changeReason ?? null,
          createdAt: newVer.createdAt,
          completedAt: newVer.completedAt ?? null,
        }
        setVersions(prev => [...prev, summary])
        setCurrentVersionId(newVer.id)
      }
    }}
  >
    + このバージョンを更新
  </button>
</div>
```

---

## 確認方法

実装後に以下で動作確認する：

1. `http://localhost:3000/projects/[any_id]` を開く
2. 右上の `v1 初回提案 ▾` をクリック
3. ドロップダウンに以下が表示されることを確認：
   - バージョン番号 + ラベル + ステータス（1行目）
   - 作成日時・完了日時（例：作成 2026/04/01 16:34）（3行目）
4. 概要テキストを入力して「+ このバージョンを更新」をクリック
5. 新しいバージョン（v2）がドロップダウンに追加されることを確認
