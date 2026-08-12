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
import { buildPixelSceneModel, type PixelSceneModel, type SceneAgent, type SceneObject } from "./pixel-scene-model";
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
  if (value === null || value === undefined) return null;
  return (
    <details className="json-details">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function PillList({ values, empty = "없음" }: { values: string[]; empty?: string }) {
  if (values.length === 0) return <span className="muted">{empty}</span>;
  return <div className="pill-list">{values.map((value) => <span className="pill" key={value}>{value}</span>)}</div>;
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

function SceneStatusLabel({ state }: { state: SceneAgent["visualState"] }) {
  const labels: Record<SceneAgent["visualState"], string> = {
    idle: "대기",
    thinking: "생각 중",
    working: "작업 중",
    challenging: "반증 중",
    revising: "수정 중",
    succeeded: "완료",
    failed: "오류",
    not_started: "미실행",
  };
  return <span>{labels[state]}</span>;
}

function SceneAgentButton({ agent, selected, onSelect }: { agent: SceneAgent; selected: boolean; onSelect: () => void }) {
  return (
    <button
      className={`scene-agent scene-agent-${agent.accent} scene-state-${agent.visualState} ${selected ? "is-selected" : ""}`}
      style={{ left: `${agent.position.x}%`, top: `${agent.position.y}%` }}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${agent.displayName}, ${agent.role}, 상태 ${agent.visualState}`}
      data-scene-state={agent.visualState}
      type="button"
    >
      <span className="scene-agent-shadow" aria-hidden="true" />
      <img src={`/scene/agents/${agent.id}.png`} alt="" className="scene-agent-sprite" draggable="false" />
      <span className="scene-agent-nameplate"><strong>{agent.displayName}</strong><small>{agent.role}</small></span>
      <span className="scene-agent-status"><i aria-hidden="true" /><SceneStatusLabel state={agent.visualState} /></span>
      <span className="scene-speech" role="status">{agent.speech}</span>
    </button>
  );
}

function sceneObjectLabel(object: SceneObject): string {
  return `${object.kind} ${object.title}: ${object.text}`;
}

function SceneObjectButton({ object, selected, onSelect }: { object: SceneObject; selected: boolean; onSelect: () => void }) {
  if (object.kind === "problem") {
    return (
      <button className={`scene-object scene-problem-object ${selected ? "is-selected" : ""}`} style={{ left: `${object.position.x}%`, top: `${object.position.y}%` }} onClick={onSelect} aria-pressed={selected} aria-label={sceneObjectLabel(object)} type="button">
        <span className="scene-object-pin" aria-hidden="true">✦</span>
        <span className="scene-object-kicker">현재 문제</span>
        <strong>{object.title}</strong>
        <span>{object.text}</span>
      </button>
    );
  }
  const icon = object.kind === "claim" ? "C" : object.kind === "rebuttal" ? "!" : object.kind === "revision" ? "↻" : "⚠";
  return (
    <button className={`scene-object scene-document scene-document-${object.kind} scene-emphasis-${object.emphasis} ${selected ? "is-selected" : ""}`} style={{ left: `${object.position.x}%`, top: `${object.position.y}%` }} onClick={onSelect} aria-pressed={selected} aria-label={sceneObjectLabel(object)} type="button">
      <span className="scene-document-icon" aria-hidden="true">{icon}</span>
      <span className="scene-document-copy"><strong>{object.title}</strong><span>{object.text}</span></span>
    </button>
  );
}

function SceneRelationshipLayer({ scene, selectedRelationshipId }: { scene: PixelSceneModel; selectedRelationshipId: string | null }) {
  const selected = scene.relationships.find((relationship) => relationship.id === selectedRelationshipId);
  if (!selected) return null;
  const objectById = new Map(scene.objects.map((object) => [object.id, object]));
  const claim = objectById.get(selected.claimObjectId);
  const rebuttal = objectById.get(selected.rebuttalObjectId);
  const revision = objectById.get(selected.revisionObjectId);
  if (!claim || !rebuttal || !revision) return null;
  return (
    <svg className="scene-relationship-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id="scene-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" /></marker></defs>
      <path className="scene-relationship-path" d={`M ${claim.position.x} ${claim.position.y} C ${claim.position.x + 4} ${claim.position.y - 3}, ${rebuttal.position.x - 4} ${rebuttal.position.y - 3}, ${rebuttal.position.x} ${rebuttal.position.y}`} markerEnd="url(#scene-arrow)" />
      <path className="scene-relationship-path scene-relationship-path-revision" d={`M ${rebuttal.position.x} ${rebuttal.position.y} C ${rebuttal.position.x + 4} ${rebuttal.position.y - 3}, ${revision.position.x - 4} ${revision.position.y - 3}, ${revision.position.x} ${revision.position.y}`} markerEnd="url(#scene-arrow)" />
    </svg>
  );
}

function PixelScene({ scene, selectedAgentId, selectedObjectId, selectedRelationshipId, onAgentSelect, onObjectSelect }: {
  scene: PixelSceneModel;
  selectedAgentId: string | null;
  selectedObjectId: string | null;
  selectedRelationshipId: string | null;
  onAgentSelect: (agent: SceneAgent) => void;
  onObjectSelect: (object: SceneObject) => void;
}) {
  return (
    <section className="pixel-scene-shell" aria-labelledby="scene-title">
      <div className="scene-heading">
        <div><span className="section-eyebrow">Living agent room</span><h2 id="scene-title">Council floor</h2><p>캐릭터를 클릭하면 지금 어떤 사고를 하고 있는지 확인할 수 있습니다.</p></div>
        <div className="scene-legend" aria-label="Agent scene legend"><span><i className="scene-legend-dot scene-legend-blue" />분석·수정</span><span><i className="scene-legend-dot scene-legend-red" />반증·경고</span><span><i className="scene-legend-dot scene-legend-gold" />문서·관계</span></div>
      </div>
      <div className="pixel-scene" data-testid="pixel-scene">
        <img className="pixel-scene-background" src="/scene/background/council-room.png" alt="픽셀 아트 Agent Council 협업실" draggable="false" />
        <div className="scene-grid-overlay" aria-hidden="true" />
        <SceneRelationshipLayer scene={scene} selectedRelationshipId={selectedRelationshipId} />
        <div className="scene-object-layer">
          {scene.objects.map((object) => <SceneObjectButton key={object.id} object={object} selected={selectedObjectId === object.id || selectedRelationshipId === object.relatedRelationshipId} onSelect={() => onObjectSelect(object)} />)}
        </div>
        <div className="scene-agent-layer">
          {scene.agents.map((agent) => <SceneAgentButton key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => onAgentSelect(agent)} />)}
        </div>
        <div className="scene-sign scene-sign-analyst">ANALYST DESK</div>
        <div className="scene-sign scene-sign-falsifier">FALSIFIER DESK</div>
        <div className="scene-floor-note">클릭해서 조사</div>
      </div>
    </section>
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
        <div className="run-detail-metrics"><Metric label="Attempts" value={String(run.attempts)} /><Metric label="Tokens" value={formatTokens(run.inputTokens, run.outputTokens)} /><Metric label="Round" value={run.roundId} /></div>
        {run.errorMessage ? <div className="error-box"><strong>실패</strong><span>{run.errorMessage}</span></div> : null}
        <JsonBlock value={run.validatedOutput} label="Validated output JSON" />
        {run.rawOutput ? <JsonBlock value={run.rawOutput} label="Raw model output" /> : null}
      </div>
    </details>
  );
}

function ProblemInspector({ board }: { board: AgentBoardModel }) {
  return (
    <section className="inspector-panel inspector-scene" aria-labelledby="inspector-title">
      <div className="inspector-head"><div><span className="section-eyebrow">Selected object · central problem</span><h2 id="inspector-title">{board.problem.title}</h2></div><span className="inspector-icon">✦</span></div>
      <p className="inspector-purpose">{board.problem.problem}</p>
      <div className="inspector-columns"><div><span className="field-label">Goals</span><PillList values={board.problem.goals} /></div><div><span className="field-label">Constraints</span><PillList values={board.problem.constraints} /></div></div>
      <div className="inspector-block inspector-claim"><span className="field-label">Context</span><p>{board.problem.context}</p></div>
    </section>
  );
}

function SceneInspector({ board, agent, relationship, object }: { board: AgentBoardModel; agent: AgentBoardAgent | null; relationship: AgentRelationship | null; object: SceneObject | null }) {
  if (relationship) {
    return (
      <section className="inspector-panel inspector-scene" aria-labelledby="inspector-title">
        <div className="inspector-head"><div><span className="section-eyebrow">Selected relationship</span><h2 id="inspector-title">Claim → Rebuttal → Revision</h2></div><span className="inspector-icon">↗</span></div>
        <div className="inspector-flow">
          <div className="inspector-block inspector-claim"><span className="field-label">Claim · {relationship.claim?.id ?? "missing"}</span><p>{relationship.claim?.text ?? "연결된 Claim을 찾을 수 없습니다."}</p></div>
          <div className="inspector-block inspector-rebuttal"><span className="field-label">Rebuttal · {relationship.rebuttal?.severity ?? "missing"}</span><p>{relationship.rebuttal?.strongestCounterargument ?? "연결된 반박이 없습니다."}</p>{relationship.rebuttal ? <small>실패 조건: {relationship.rebuttal.failureScenario}</small> : null}</div>
          <div className="inspector-block inspector-revision"><span className="field-label">Revision · {relationship.revision?.action ?? "missing"}</span><p>{relationship.revision?.after?.text ?? relationship.revision?.rationale ?? "반박 이후 수정이 없습니다."}</p>{relationship.revision ? <small>이유: {relationship.revision.rationale}</small> : null}</div>
        </div>
        {relationship.missingReferences.length > 0 ? <div className="warning-list"><span>⚠ {relationship.missingReferences.join(", ")}</span></div> : null}
      </section>
    );
  }
  if (object?.kind === "problem") return <ProblemInspector board={board} />;
  if (!agent) {
    return <section className="inspector-panel inspector-empty" aria-labelledby="inspector-title"><div className="inspector-icon">◎</div><span className="section-eyebrow">Inspector</span><h2 id="inspector-title">캐릭터를 선택해 보세요</h2><p>씬 안의 Analyst 또는 Falsifier를 클릭하면 역할, 실행 단계, 검증된 output이 이곳에 나타납니다.</p></section>;
  }
  return (
    <section className={`inspector-panel inspector-${agent.metadata.accent}`} aria-labelledby="inspector-title">
      <div className="inspector-head"><div><span className="section-eyebrow">Selected agent · {agent.metadata.role}</span><h2 id="inspector-title">{agent.metadata.displayName} details</h2></div><span className="agent-avatar inspector-avatar">{agent.metadata.icon}</span></div>
      <p className="inspector-purpose">{agent.metadata.purpose}</p>
      <div className="inspector-columns"><div><span className="field-label">Responsibilities</span><PillList values={agent.metadata.responsibilities} /></div><div><span className="field-label">Non-goals</span><PillList values={agent.metadata.nonGoals} /></div></div>
      <div className="inspector-stat-grid"><Metric label="Status" value={statusLabel(agent.status)} /><Metric label="Agent runs" value={String(agent.runs.length)} /><Metric label="Records" value={`${agent.claims.length + agent.rebuttals.length + agent.revisions.length}`} detail="claims · rebuttals · revisions" /></div>
      <div className="agent-run-list"><span className="field-label">Execution phases</span>{agent.runs.length > 0 ? agent.runs.map((run) => <AgentRunRow key={run.id} run={run} />) : <p className="muted">실행 기록이 없습니다.</p>}</div>
    </section>
  );
}

function ExecutionDetails({ artifact, timeline }: { artifact: CanonicalRunArtifact; timeline: TimelineItem[] }) {
  return (
    <details className="execution-details">
      <summary><span><span className="section-eyebrow">Secondary view</span><strong>Execution details</strong></span><span className="section-count">{timeline.length} stages · {artifact.traceEvents.length} events</span></summary>
      <div className="execution-body"><div className="execution-list">{timeline.map((item) => <div className="execution-row" key={item.round.id}><span className="execution-index">{String(item.round.index + 1).padStart(2, "0")}</span><span className="execution-name"><strong>{roundLabels[item.round.kind]}</strong><small>{item.agentRuns.map((run) => run.agentId).join(" · ") || "normalized record"}</small></span><Badge status={item.round.status} /><span className="muted">{formatTimestamp(item.round.completedAt)}</span></div>)}</div><div className="trace-list"><span className="field-label">Trace events</span>{artifact.traceEvents.map((event) => <div className="trace-row" key={event.id}><span className="trace-sequence">{String(event.sequence).padStart(2, "0")}</span><span className="trace-type">{event.type}</span><span className="muted">{formatTimestamp(event.timestamp)}</span></div>)}</div></div>
    </details>
  );
}

function RunSelector({ runs, selectedRunId, onSelect }: { runs: RunSummary[]; selectedRunId: string | null; onSelect: (runId: string) => void }) {
  return <label className="run-selector"><span className="section-eyebrow">Loaded runs</span><select value={selectedRunId ?? ""} onChange={(event) => onSelect(event.target.value)}>{runs.map((run) => <option key={run.runId} value={run.runId}>{run.title} · {run.provider}</option>)}</select></label>;
}

export default function App() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<CanonicalRunArtifact | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
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

  useEffect(() => { void refreshRuns(); }, []);

  useEffect(() => {
    if (!selectedRunId) {
      setArtifact(null);
      setSelectedAgentId(null);
      setSelectedRelationshipId(null);
      setSelectedObjectId(null);
      return;
    }
    let cancelled = false;
    setLoadingArtifact(true);
    setError(null);
    void loadRunArtifact(selectedRunId).then((nextArtifact) => {
      if (cancelled) return;
      setArtifact(nextArtifact);
      setSelectedAgentId(null);
      setSelectedRelationshipId(null);
      setSelectedObjectId(null);
    }).catch((cause: unknown) => {
      if (!cancelled) {
        setArtifact(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }).finally(() => {
      if (!cancelled) setLoadingArtifact(false);
    });
    return () => { cancelled = true; };
  }, [selectedRunId]);

  const board = useMemo(() => (artifact ? buildAgentBoardModel(artifact) : null), [artifact]);
  const scene = useMemo(() => (board ? buildPixelSceneModel(board) : null), [board]);
  const timeline = useMemo(() => (artifact ? buildTimeline(artifact) : []), [artifact]);
  const selectedSummary = runs.find((run) => run.runId === selectedRunId);
  const selectedAgent = board?.agents.find((agent) => agent.id === selectedAgentId) ?? null;
  const selectedRelationship = board?.relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null;
  const selectedObject = scene?.objects.find((object) => object.id === selectedObjectId) ?? null;

  return (
    <div className="app-shell">
      <div className="topbar"><div className="brand-lockup"><span className="brand-mark">AC</span><div><strong>Agent Council</strong><span>Living collaboration room</span></div></div><div className="topbar-actions">{runs.length > 0 ? <RunSelector runs={runs} selectedRunId={selectedRunId} onSelect={setSelectedRunId} /> : null}<button className="refresh-button" onClick={() => void refreshRuns()} disabled={loadingRuns}>{loadingRuns ? "Loading…" : "Refresh"}</button></div></div>
      {error ? <div className="global-error" role="alert"><strong>Artifact를 불러오지 못했습니다.</strong><span>{error}</span></div> : null}
      {loadingRuns && runs.length === 0 ? <EmptyState title="Loading local runs" description="artifacts/runs의 canonical JSON을 읽고 있습니다." /> : runs.length === 0 ? <EmptyState title="아직 실행 결과가 없습니다" description="먼저 `pnpm run council run --scenario ...`을 실행하면 이 화면에서 확인할 수 있습니다." /> : loadingArtifact || !artifact || !selectedSummary || !board || !scene ? <div className="loading-state">선택한 Run artifact를 불러오는 중…</div> : (
        <main className="workspace">
          <RunSummaryHeader summary={selectedSummary} artifact={artifact} board={board} />
          <div className="scene-intro"><div><span className="section-eyebrow">Agent metaverse board</span><h2>Agent들이 문제를 풀고 있는 현장</h2><p>실행된 Agent만 공간에 등장하며, 상태에 따라 작업·반증·수정 모습이 달라집니다.</p></div><div className="scene-live-key"><span><i className="scene-pulse-dot" />artifact snapshot</span><span>{scene.agents.length} agents · {scene.relationships.length} relationships</span></div></div>
          <PixelScene scene={scene} selectedAgentId={selectedAgentId} selectedObjectId={selectedObjectId} selectedRelationshipId={selectedRelationshipId} onAgentSelect={(agent) => { setSelectedAgentId(agent.id); setSelectedRelationshipId(null); setSelectedObjectId(null); }} onObjectSelect={(object) => { setSelectedObjectId(object.id); if (object.relatedRelationshipId) { setSelectedRelationshipId(object.relatedRelationshipId); setSelectedAgentId(null); } else { setSelectedRelationshipId(null); setSelectedAgentId(null); } }} />
          <div className="lower-grid"><SceneInspector board={board} agent={selectedAgent} relationship={selectedRelationship} object={selectedObject} /><ExecutionDetails artifact={artifact} timeline={timeline} /></div>
        </main>
      )}
    </div>
  );
}
