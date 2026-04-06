import { requestStopAll } from '@/lib/execution-control'

export async function POST() {
  requestStopAll()
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
