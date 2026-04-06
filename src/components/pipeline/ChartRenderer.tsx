'use client'
import { useEffect, useRef } from 'react'
import {
  Chart,
  BarController, BarElement,
  ScatterController, PointElement,
  RadarController, RadialLinearScale,
  LinearScale, CategoryScale,
  Tooltip, Legend,
} from 'chart.js'

Chart.register(
  BarController, BarElement,
  ScatterController, PointElement,
  RadarController, RadialLinearScale,
  LinearScale, CategoryScale,
  Tooltip, Legend,
)

type ChartType = 'bar' | 'scatter' | 'radar' | 'heatmap'

interface BarChartData {
  type: 'bar'
  title?: string
  unit?: string
  labels: string[]
  values: number[]
  clientIndex?: number
  reliability?: string
}

interface ScatterPoint {
  name?: string
  x: number
  y: number
  isClient?: boolean
}

interface ScatterChartData {
  type: 'scatter'
  title?: string
  xLabel?: string
  yLabel?: string
  points: ScatterPoint[]
}

interface RadarChartData {
  type: 'radar'
  title?: string
  axes: string[]
  datasets: Array<{
    label: string
    values: number[]
    color?: string
  }>
}

type ChartDataInput = BarChartData | ScatterChartData | RadarChartData | { type: ChartType; [key: string]: unknown }

interface ChartRendererProps {
  data: ChartDataInput
  height?: number
}

export function ChartRenderer({ data, height = 280 }: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (data.type === 'bar') {
      const d = data as BarChartData
      const backgroundColors = d.labels.map((_, i) =>
        i === d.clientIndex ? 'rgba(255, 107, 53, 0.85)' : 'rgba(100, 120, 200, 0.6)'
      )
      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: d.labels,
          datasets: [{
            label: d.unit ? `(${d.unit})` : '',
            data: d.values,
            backgroundColor: backgroundColors,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (item) => `${item.formattedValue}${d.unit ? ' ' + d.unit : ''}`,
              },
            },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } },
          },
        },
      })
    } else if (data.type === 'scatter') {
      const d = data as ScatterChartData
      const clientPoints = d.points.filter(p => p.isClient)
      const competitorPoints = d.points.filter(p => !p.isClient)
      chartRef.current = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'クライアント',
              data: clientPoints.map(p => ({ x: p.x, y: p.y })),
              backgroundColor: 'rgba(255, 107, 53, 0.9)',
              pointRadius: 10,
              pointHoverRadius: 12,
            },
            {
              label: '競合',
              data: competitorPoints.map(p => ({ x: p.x, y: p.y })),
              backgroundColor: 'rgba(100, 120, 200, 0.6)',
              pointRadius: 7,
              pointHoverRadius: 9,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (item) => {
                  const ds = item.dataset.label === 'クライアント' ? clientPoints : competitorPoints
                  const point = ds[item.dataIndex]
                  return `${point.name ?? item.dataset.label}: (${item.parsed.x}, ${item.parsed.y})`
                },
              },
            },
          },
          scales: {
            x: { title: { display: !!d.xLabel, text: d.xLabel }, grid: { color: 'rgba(0,0,0,0.05)' } },
            y: { title: { display: !!d.yLabel, text: d.yLabel }, grid: { color: 'rgba(0,0,0,0.05)' } },
          },
        },
      })
    } else if (data.type === 'radar') {
      const d = data as RadarChartData
      const colors = ['rgba(255,107,53,0.7)', 'rgba(100,120,200,0.5)', 'rgba(80,200,120,0.5)']
      chartRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: d.axes,
          datasets: d.datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.values,
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length].replace('0.7', '0.15').replace('0.5', '0.15'),
            borderWidth: 2,
            pointRadius: 3,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: {
            r: {
              min: 0, max: 10,
              ticks: { stepSize: 2, font: { size: 10 } },
              grid: { color: 'rgba(0,0,0,0.07)' },
            },
          },
        },
      })
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data])

  if (data.type === 'heatmap') {
    return (
      <div style={{ fontSize: '12px', color: 'var(--ink3)', padding: '8px' }}>
        heatmap は未対応（将来実装）
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
