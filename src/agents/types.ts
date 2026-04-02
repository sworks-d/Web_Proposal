export type AgentId =
  | 'AG-01' | 'AG-02' | 'AG-03'
  | 'AG-04' | 'AG-05' | 'AG-06' | 'AG-07'
  | 'AG-02-JOURNEY' | 'AG-02-STP' | 'AG-02-VPC' | 'AG-02-MERGE'
  | 'AG-03-DATA' | 'AG-03-GAP' | 'AG-03-HEURISTIC' | 'AG-03-HEURISTIC2' | 'AG-03-MERGE'
  | 'AG-04-MAIN' | 'AG-04-MERGE'
  | 'AG-07A' | 'AG-07B' | 'AG-07C'

export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type VizType = 'chart' | 'mermaid' | 'matrix' | 'positioning'
export type RendererType = 'recharts' | 'mermaid' | 'custom-svg'

export interface ProjectContext {
  clientName: string
  clientIndustry?: string
  briefText: string
  industryType: string
  knownConstraints?: string
  cdNotes?: Record<string, string>  // AGId別にCDが追加したヒアリング情報
}

export interface Section {
  id: string
  title: string
  content: string
  sectionType: string
  isEditable: boolean
  canRegenerate: boolean
}

export interface Visualization {
  id: string
  title: string
  vizType: VizType
  renderer: RendererType
  data: Record<string, unknown>
  exportFormats: ('svg' | 'png' | 'json')[]
}

export interface OutputMetadata {
  confidence: ConfidenceLevel
  factBasis: string[]
  assumptions: string[]
  missingInfo: string[]
}

export interface AgentInput {
  projectContext: ProjectContext
  previousOutputs: AgentOutput[]
  userInstruction?: string
}

export interface AgentOutput {
  agentId: AgentId
  sections: Section[]
  visualizations: Visualization[]
  metadata: OutputMetadata
}

export type SSEEvent =
  | { type: 'status'; message: string }
  | { type: 'complete'; output: AgentOutput; executionId: string }
  | { type: 'error'; message: string }

// AG選択の型
export type PrimaryAgentId =
  | 'ag-02-recruit' | 'ag-02-brand' | 'ag-02-ec'
  | 'ag-02-corp'   | 'ag-02-camp'  | 'ag-02-btob' | 'ag-02-general'
  | 'ag-02-journey' | 'ag-02-stp'  | 'ag-02-vpc'  | 'ag-02-merge'

export type SubAgentId =
  | 'ag-02-sub-beauty' | 'ag-02-sub-food'    | 'ag-02-sub-finance'
  | 'ag-02-sub-health' | 'ag-02-sub-education' | 'ag-02-sub-life'
  | 'ag-02-sub-fashion' | 'ag-02-sub-auto'   | 'ag-02-sub-tech'
  | 'ag-02-sub-culture' | 'ag-02-sub-sport'  | 'ag-02-sub-travel'
  | 'ag-02-sub-gov'    | 'ag-02-sub-creative'

export interface AgentRecommendation {
  primary: {
    agentId: PrimaryAgentId
    label: string
    rationale: string
    confidence: 'high' | 'medium' | 'low'
  }
  sub: Array<{
    agentId: SubAgentId
    label: string
    rationale: string
  }>
  secondaryOption?: {
    agentId: PrimaryAgentId
    label: string
    rationale: string
  }
  otherAgents: AgentId[]
}

export type CheckpointStatus = 'pending' | 'waiting' | 'approved' | 'rejected'

export interface Checkpoint {
  id: string
  executionId: string
  phase: 1 | 2 | 3 | 4
  status: CheckpointStatus
  agentSelection?: {
    primary: PrimaryAgentId
    sub: SubAgentId[]
    secondary?: PrimaryAgentId
  }
  createdAt: Date
  approvedAt?: Date
}

export type PipelineMode = 'full' | 'spot'

export interface PipelineConfig {
  mode: PipelineMode
  primaryAgent: PrimaryAgentId
  subAgents: SubAgentId[]
  secondaryAgent?: PrimaryAgentId
  startFrom?: AgentId
}

export type AgentSelection = {
  primary: PrimaryAgentId
  sub: SubAgentId[]
  secondary?: PrimaryAgentId
}

// Extended SSE events for Phase 2
export type SSEEventPhase2 =
  | { type: 'status'; message: string }
  | { type: 'complete'; output: AgentOutput; executionId: string }
  | { type: 'error'; message: string }
  | { type: 'checkpoint'; checkpointId: string; phase: 1 | 2 | 3 | 4; outputs?: AgentOutput[]; recommendation?: AgentRecommendation; output?: AgentOutput }
  | { type: 'waiting'; checkpointId: string }
  | { type: 'pipeline_complete'; executionId: string }
