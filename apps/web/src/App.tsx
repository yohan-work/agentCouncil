import { useEffect, useMemo, useState } from "react";

import type { CanonicalRunArtifact } from "@agent-council/shared/browser";

import { loadRunArtifact, loadRunSummaries } from "./api";
import {
  buildAgentBoardModel,
  type AgentBoardAgent,
  type AgentBoardModel,
  type AgentBoardRun,
  type AgentRelationship,
} from "./agent-board-model";
import {
  buildTimeline,
  formatDuration,
  formatTimestamp,
  formatTokens,
  roundLabels,
  statusLabel,
  statusTone,
  type RunSummary,
  type TimelineItem,
} from "./types";

function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${statusTone(status)}`}>{statusLabel(status)}</span>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {detail ? <span className="metric-detail">{detail}</span> : null}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-mark">◎</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  if (value === null || value === undefined) {
    return null;
  }
  return (
    <details className="json-details">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function PillList({ values, empty = "없음" }: { values: string[]; empty?: string }) {
  if (values.length === 0) {
    return <span className="muted">{empty}</span>;
  }
  return (
    <div className="pill-list">
      {values.map((value) => (
        <span className="pill" key={value}>
          {value}
        </span>
      ))}
    </div>
  );
}

function RunSummaryHeader({ summary, artifact, board }: { summary: RunSummary; artifact: CanonicalRunArtifact; board: AgentBoardModel }) {
  return (
    <header className="run-header">
      <div className="run-heading">
        <div>
          <span className="section-eyebrow">Run detail · {summary.scenarioId}</span>
          <h1>{summary.title}</h1>
          <p>{artifact.run.scenario.problem}</p>
        </div>
        <Badge status={summary.status} />
      </div>
      <div className="run-meta-row">
        <span>{summary.provider} / {summary.model}</span>
        <span>생성 {formatTimestamp(summary.createdAt)}</span>
        <span>완료 {formatTimestamp(summary.completedAt)}</span>
      </div>
      <div className="summary-metrics">
        <Metric label="Claims" value={String(board.outcome.claimCount)} detail={`${artifact.claims.length} records · ${board.outcome.challengedCount}개 반박 대상`} />
        <Metric label="Rebuttals" value={String(summary.rebuttals)} detail="Falsifier 공격" />
        <Metric label="Revisions" value={String(board.outcome.revisedCount)} detail={board.outcome.finalActionSummary} />
        <Metric label="Latency" value={formatDuration(summary.durationMs || 0)} detail="agent run 합계" />
        <Metric label="Cost" value="0" detail="local model" />
      </div>
    </header>
  );
}

function OutcomeStrip({ board }: { board: AgentBoardModel }) {
  return (
    <div className="outcome-strip" aria-label="Run outcome summary">
      <div className="outcome-mark">↳</div>
      <div>
        <span className="section-eyebrow">Current outcome</span>
        <strong>{board.outcome.finalActionSummary}</strong>
        <p>반박과 수정이 연결된 Claim을 기준으로 읽습니다. 최종 판단이 아니라 현재까지의 사고 흔적입니다.</p>
      </div>
      <div className="outcome-counts">
        <span><strong>{board.outcome.claimCount}</strong> claims</span>
        <span><strong>{board.outcome.challengedCount}</strong> challenged</span>
        <span><strong>{board.outcome.revisedCount}</strong> revised</span>
      </div>
    </div>
  );
}

function ProblemCard({ board }: { board: AgentBoardModel }) {
  const { problem } = board;
  return (
    <section className="problem-card" aria-labelledby="problem-title">
      <div className="problem-card-head">
        <div>
          <span className="section-eyebrow">Central problem</span>
          <h2 id="problem-title">{problem.title}</h2>
        </div>
        <span className="problem-id">{problem.id}</span>
      </div>
      <p className="problem-copy">{problem.problem}</p>
      <div className="context-callout">
        <span className="field-label">Context</span>
        <p>{problem.context}</p>
      </div>
      <div className="problem-fields">
        <div>
          <span className="field-label">Goals</span>
          <PillList values={problem.goals} />
        </div>
        <div>
          <span className="field-label">Constraints</span>
          <PillList values={problem.constraints} />
        </div>
      </div>
      <OutcomeStrip board={board} />
    </section>
  );
}

function AgentCard({ agent, selected, onSelect }: { agent: AgentBoardAgent; selected: boolean; onSelect: () => void }) {
  return (
    <button
      className={`agent-card agent-${agent.metadata.accent} ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      type="button"
    >
      <span className="agent-card-head">
        <span className="agent-avatar" aria-hidden="true">{agent.metadata.icon}</span>
        <span className="agent-card-title">
          <span className="section-eyebrow">{agent.metadata.role}</span>
          <strong>{agent.metadata.displayName}</strong>
        </span>
        <Badge status={agent.status} />
      </span>
      <span className="agent-summary">{agent.summary}</span>
      <span className="agent-stat-row">
        <span><strong>{agent.claims.filter((claim) => claim.parentClaimId === null).length}</strong> Claim</span>
        <span><strong>{agent.rebuttals.length}</strong> 반박</span>
        <span><strong>{agent.revisions.length}</strong> 수정</span>
      </span>
      <span className="agent-phase-list">
        {agent.runs.length > 0 ? agent.runs.map((run) => <span className="phase-chip" key={run.id}>{run.phaseLabel}</span>) : <span className="phase-chip phase-muted">실행 기록 없음</span>}
      </span>
      <span className="agent-card-hint">선택하여 역할과 실행 결과 보기 <span aria-hidden="true">→</span></span>
    </button>
  );
}

function RelationStep({ label, className, title, text, empty, status }: {
  label: string;
  className: string;
  title?: string;
  text?: string;
  empty?: string;
  status?: string;
}) {
  return (
    <span className={`relation-step ${className}`}>
      <span className="relation-label">{label}</span>
      {title ? <strong>{title}</strong> : <strong className="relation-empty">{empty}</strong>}
      {text ? <span className="relation-text">{text}</span> : null}
      {status ? <Badge status={status} /> : null}
    </span>
  );
}

function RelationshipCard({ relationship, selected, onSelect }: { relationship: AgentRelationship; selected: boolean; onSelect: () => void }) {
  const claim = relationship.claim;
  const rebuttal = relationship.rebuttal;
  const revision = relationship.revision;
  return (
    <button className={`relationship-card ${selected ? "is-selected" : ""}`} onClick={onSelect} aria-pressed={selected} type="button">
      <span className="relationship-id">{claim?.id ?? "연결되지 않은 기록"}</span>
      <span className="relation-track">
        <RelationStep label="Claim" className="relation-claim" title={claim?.text} empty="Claim 없음" text={claim?.rationale} status={claim?.status} />
        <span className="relation-arrow" aria-hidden="true">→</span>
        <RelationStep label="Rebuttal" className="relation-rebuttal" title={rebuttal ? `severity ${rebuttal.severity}` : undefined} empty="반박 없음" text={rebuttal?.strongestCounterargument} status={rebuttal?.severity} />
        <span className="relation-arrow" aria-hidden="true">→</span>
        <RelationStep label="Revision" className="relation-revision" title={revision?.action} empty="수정 없음" text={revision?.after?.text ?? revision?.rationale} status={revision ? "revised" : undefined} />
      </span>
      {relationship.missingReferences.length > 0 ? <span className="relationship-warning">연결 확인 필요 · {relationship.missingReferences.join(", ")}</span> : null}
      <span className="relationship-hint">관계 상세 보기 <span aria-hidden="true">↗</span></span>
    </button>
  );
}

function RelationshipBoard({ board, selectedRelationshipId, onSelect }: { board: AgentBoardModel; selectedRelationshipId: string | null; onSelect: (relationshipId: string) => void }) {
  return (
    <section className="relationship-board" aria-labelledby="relationship-title">
      <div className="section-heading-row">
        <div>
          <span className="section-eyebrow">Reasoning relationships</span>
          <h2 id="relationship-title">Claim → Rebuttal → Revision</h2>
        </div>
        <span className="section-count">{board.relationships.length} links</span>
      </div>
      <p className="section-intro">중앙 문제에 대한 주장이 어떻게 공격받고, 어떤 조건으로 바뀌었는지 한 줄씩 추적합니다.</p>
      {board.relationships.length > 0 ? (
        <div className="relationship-list">
          {board.relationships.map((relationship) => (
            <RelationshipCard
              key={relationship.id}
              relationship={relationship}
              selected={relationship.id === selectedRelationshipId}
              onSelect={() => onSelect(relationship.id)}
            />
          ))}
        </div>
      ) : (
        <div className="inline-empty">아직 Claim 관계가 생성되지 않았습니다.</div>
      )}
      {board.warnings.length > 0 ? (
        <div className="warning-list" role="status">
          {board.warnings.map((warning) => <span key={warning}>⚠ {warning}</span>)}
        </div>
      ) : null}
    </section>
  );
}

function BoardLegend() {
  return (
    <div className="board-legend" aria-label="Board legend">
      <span><i className="legend-dot legend-blue" />구조화 / 수정</span>
      <span><i className="legend-dot legend-red" />반증 / 공격</span>
      <span><i className="legend-dot legend-purple" />연결된 관계</span>
    </div>
  );
}

function AgentRunRow({ run }: { run: AgentBoardRun }) {
  return (
    <details className="agent-run-row">
      <summary>
        <span className="run-row-title"><strong>{run.phaseLabel}</strong><span>{run.id}</span></span>
        <span className="run-row-meta"><Badge status={run.status} /><span>{formatDuration(run.durationMs)}</span></span>
      </summary>
      <div className="run-row-details">
        <div className="run-detail-metrics">
          <Metric label="Attempts" value={String(run.attempts)} />
          <Metric label="Tokens" value={formatTokens(run.inputTokens, run.outputTokens)} />
          <Metric label="Round" value={run.roundId} />
        </div>
        {run.errorMessage ? <div className="error-box"><strong>실패</strong><span>{run.errorMessage}</span></div> : null}
        <JsonBlock value={run.validatedOutput} label="Validated output JSON" />
        {run.rawOutput ? <JsonBlock value={run.rawOutput} label="Raw model output" /> : null}
      </div>
    </details>
  );
}

function AgentDetailPanel({ agent, relationship }: { agent: AgentBoardAgent | null; relationship: AgentRelationship | null }) {
  if (relationship) {
    return (
      <section className="inspector-panel" aria-labelledby="inspector-title">
        <div className="inspector-head">
          <div>
            <span className="section-eyebrow">Selected relationship</span>
            <h2 id="inspector-title">Claim → Rebuttal → Revision</h2>
          </div>
          <span className="inspector-icon">↗</span>
        </div>
        <div className="inspector-flow">
          <div className="inspector-block inspector-claim"><span className="field-label">Claim · {relationship.claim?.id ?? "missing"}</span><p>{relationship.claim?.text ?? "연결된 Claim을 찾을 수 없습니다."}</p></div>
          <div className="inspector-block inspector-rebuttal"><span className="field-label">Rebuttal · {relationship.rebuttal?.severity ?? "missing"}</span><p>{relationship.rebuttal?.strongestCounterargument ?? "연결된 반박이 없습니다."}</p>{relationship.rebuttal ? <small>실패 조건: {relationship.rebuttal.failureScenario}</small> : null}</div>
          <div className="inspector-block inspector-revision"><span className="field-label">Revision · {relationship.revision?.action ?? "missing"}</span><p>{relationship.revision?.after?.text ?? relationship.revision?.rationale ?? "반박 이후 수정이 없습니다."}</p>{relationship.revision ? <small>이유: {relationship.revision.rationale}</small> : null}</div>
        </div>
        {relationship.missingReferences.length > 0 ? <div className="warning-list"><span>⚠ {relationship.missingReferences.join(", ")}</span></div> : null}
      </section>
    );
  }

  if (!agent) {
    return (
      <section className="inspector-panel inspector-empty" aria-labelledby="inspector-title">
        <div className="inspector-icon">◎</div>
        <span className="section-eyebrow">Inspector</span>
        <h2 id="inspector-title">Agent를 선택해 보세요</h2>
        <p>왼쪽 Analyst 또는 오른쪽 Falsifier를 선택하면 역할, 실행 단계, 검증된 output을 확인할 수 있습니다.</p>
      </section>
    );
  }

  return (
    <section className={`inspector-panel inspector-${agent.metadata.accent}`} aria-labelledby="inspector-title">
      <div className="inspector-head">
        <div>
          <span className="section-eyebrow">Selected agent · {agent.metadata.role}</span>
          <h2 id="inspector-title">{agent.metadata.displayName} details</h2>
        </div>
        <span className="agent-avatar inspector-avatar">{agent.metadata.icon}</span>
      </div>
      <p className="inspector-purpose">{agent.metadata.purpose}</p>
      <div className="inspector-columns">
        <div><span className="field-label">Responsibilities</span><PillList values={agent.metadata.responsibilities} /></div>
        <div><span className="field-label">Non-goals</span><PillList values={agent.metadata.nonGoals} /></div>
      </div>
      <div className="inspector-stat-grid">
        <Metric label="Status" value={statusLabel(agent.status)} />
        <Metric label="Agent runs" value={String(agent.runs.length)} />
        <Metric label="Records" value={`${agent.claims.length + agent.rebuttals.length + agent.revisions.length}`} detail="claims · rebuttals · revisions" />
      </div>
      <div className="agent-run-list">
        <span className="field-label">Execution phases</span>
        {agent.runs.length > 0 ? agent.runs.map((run) => <AgentRunRow key={run.id} run={run} />) : <p className="muted">실행 기록이 없습니다.</p>}
      </div>
    </section>
  );
}

function ExecutionDetails({ artifact, timeline }: { artifact: CanonicalRunArtifact; timeline: TimelineItem[] }) {
  return (
    <details className="execution-details">
      <summary>
        <span><span className="section-eyebrow">Secondary view</span><strong>Execution details</strong></span>
        <span className="section-count">{timeline.length} stages · {artifact.traceEvents.length} events</span>
      </summary>
      <div className="execution-body">
        <div className="execution-list">
          {timeline.map((item) => (
            <div className="execution-row" key={item.round.id}>
              <span className="execution-index">{String(item.round.index + 1).padStart(2, "0")}</span>
              <span className="execution-name"><strong>{roundLabels[item.round.kind]}</strong><small>{item.agentRuns.map((run) => run.agentId).join(" · ") || "normalized record"}</small></span>
              <Badge status={item.round.status} />
              <span className="muted">{formatTimestamp(item.round.completedAt)}</span>
            </div>
          ))}
        </div>
        <div className="trace-list">
          <span className="field-label">Trace events</span>
          {artifact.traceEvents.map((event) => (
            <div className="trace-row" key={event.id}>
              <span className="trace-sequence">{String(event.sequence).padStart(2, "0")}</span>
              <span className="trace-type">{event.type}</span>
              <span className="muted">{formatTimestamp(event.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function RunSelector({ runs, selectedRunId, onSelect }: { runs: RunSummary[]; selectedRunId: string | null; onSelect: (runId: string) => void }) {
  return (
    <label className="run-selector">
      <span className="section-eyebrow">Loaded runs</span>
      <select value={selectedRunId ?? ""} onChange={(event) => onSelect(event.target.value)}>
        {runs.map((run) => <option key={run.runId} value={run.runId}>{run.title} · {run.provider}</option>)}
      </select>
    </label>
  );
}

export default function App() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<CanonicalRunArtifact | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingArtifact, setLoadingArtifact] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRuns = async () => {
    setLoadingRuns(true);
    setError(null);
    try {
      const nextRuns = await loadRunSummaries();
      setRuns(nextRuns);
      setSelectedRunId((current) => (current && nextRuns.some((run) => run.runId === current) ? current : nextRuns[0]?.runId ?? null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    void refreshRuns();
  }, []);

  useEffect(() => {
    if (!selectedRunId) {
      setArtifact(null);
      setSelectedAgentId(null);
      setSelectedRelationshipId(null);
      return;
    }
    let cancelled = false;
    setLoadingArtifact(true);
    setError(null);
    void loadRunArtifact(selectedRunId)
      .then((nextArtifact) => {
        if (cancelled) return;
        setArtifact(nextArtifact);
        setSelectedAgentId(null);
        setSelectedRelationshipId(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setArtifact(null);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingArtifact(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  const board = useMemo(() => (artifact ? buildAgentBoardModel(artifact) : null), [artifact]);
  const timeline = useMemo(() => (artifact ? buildTimeline(artifact) : []), [artifact]);
  const selectedSummary = runs.find((run) => run.runId === selectedRunId);
  const selectedAgent = board?.agents.find((agent) => agent.id === selectedAgentId) ?? null;
  const selectedRelationship = board?.relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null;
  const analyst = board?.agents.find((agent) => agent.id === "analyst");
  const falsifier = board?.agents.find((agent) => agent.id === "falsifier");
  const otherAgents = board?.agents.filter((agent) => agent.id !== "analyst" && agent.id !== "falsifier") ?? [];

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">AC</span>
          <div><strong>Agent Council</strong><span>Local collaboration board</span></div>
        </div>
        <div className="topbar-actions">
          {runs.length > 0 ? <RunSelector runs={runs} selectedRunId={selectedRunId} onSelect={setSelectedRunId} /> : null}
          <button className="refresh-button" onClick={() => void refreshRuns()} disabled={loadingRuns}>{loadingRuns ? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      {error ? <div className="global-error" role="alert"><strong>Artifact를 불러오지 못했습니다.</strong><span>{error}</span></div> : null}

      {loadingRuns && runs.length === 0 ? (
        <EmptyState title="Loading local runs" description="artifacts/runs의 canonical JSON을 읽고 있습니다." />
      ) : runs.length === 0 ? (
        <EmptyState title="아직 실행 결과가 없습니다" description="먼저 `pnpm run council run --scenario ...`을 실행하면 이 화면에서 확인할 수 있습니다." />
      ) : loadingArtifact || !artifact || !selectedSummary || !board ? (
        <div className="loading-state">선택한 Run artifact를 불러오는 중…</div>
      ) : (
        <main className="workspace">
          <RunSummaryHeader summary={selectedSummary} artifact={artifact} board={board} />
          <div className="board-intro">
            <div><span className="section-eyebrow">Agent collaboration map</span><h2>문제를 누가 어떻게 밀어붙였는가</h2><p>요약을 먼저 읽고, Agent 또는 관계를 선택해 근거와 실행 output을 펼쳐보세요.</p></div>
            <BoardLegend />
          </div>
          <div className="agent-board">
            <div className="agent-lane lane-analyst">
              {analyst ? <AgentCard agent={analyst} selected={selectedAgentId === analyst.id} onSelect={() => { setSelectedAgentId(analyst.id); setSelectedRelationshipId(null); }} /> : <div className="lane-empty">이 실행에는 Analyst 기록이 없습니다.</div>}
              <span className="lane-caption">분석 → 수정</span>
            </div>
            <div className="board-center">
              <ProblemCard board={board} />
              <RelationshipBoard board={board} selectedRelationshipId={selectedRelationshipId} onSelect={(relationshipId) => { setSelectedRelationshipId(relationshipId); setSelectedAgentId(null); }} />
            </div>
            <div className="agent-lane lane-falsifier">
              {falsifier ? <AgentCard agent={falsifier} selected={selectedAgentId === falsifier.id} onSelect={() => { setSelectedAgentId(falsifier.id); setSelectedRelationshipId(null); }} /> : <div className="lane-empty">이 실행에는 Falsifier 기록이 없습니다.</div>}
              <span className="lane-caption">반증 → 실패 조건</span>
            </div>
          </div>
          {otherAgents.length > 0 ? <div className="other-agents"><span className="section-eyebrow">Additional agents in this run</span><div>{otherAgents.map((agent) => <AgentCard key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => { setSelectedAgentId(agent.id); setSelectedRelationshipId(null); }} />)}</div></div> : null}
          <div className="lower-grid">
            <AgentDetailPanel agent={selectedAgent} relationship={selectedRelationship} />
            <ExecutionDetails artifact={artifact} timeline={timeline} />
          </div>
        </main>
      )}
    </div>
  );
}
