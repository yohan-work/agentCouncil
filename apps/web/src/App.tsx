import { useEffect, useMemo, useState, type ReactNode } from "react";

import type {
  AgentRunRecord,
  CanonicalRunArtifact,
  Claim,
  Rebuttal,
  Revision,
} from "@agent-council/shared/browser";

import { loadRunArtifact, loadRunSummaries } from "./api";
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

type DetailProps = {
  artifact: CanonicalRunArtifact;
  timelineItem: TimelineItem;
};

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

function Section({ title, children, eyebrow }: { title: string; children: ReactNode; eyebrow?: string }) {
  return (
    <section className="detail-section">
      {eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}
      <h3>{title}</h3>
      {children}
    </section>
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

function AgentRunMeta({ agentRun }: { agentRun?: AgentRunRecord }) {
  if (!agentRun) {
    return <p className="muted">이 단계는 별도 LLM 호출 없이 정규화되었습니다.</p>;
  }
  const usage = agentRun.usage;
  return (
    <div className="agent-meta">
      <div className="agent-meta-top">
        <div>
          <span className="section-eyebrow">Agent run</span>
          <strong>
            {agentRun.agentId} <span className="version">v{agentRun.agentVersion}</span>
          </strong>
        </div>
        <Badge status={agentRun.status} />
      </div>
      <div className="agent-meta-grid">
        <Metric label="Attempts" value={String(agentRun.attempts.length)} />
        <Metric label="Duration" value={formatDuration(usage?.durationMs ?? 0)} />
        <Metric label="Usage" value={usage ? formatTokens(usage.inputTokens ?? 0, usage.outputTokens ?? 0) : "—"} />
        <Metric label="Cost" value={usage ? "Local · 0" : "—"} />
      </div>
      {agentRun.error ? (
        <div className="error-box">
          <strong>{agentRun.error.code}</strong>
          <span>{agentRun.error.message}</span>
        </div>
      ) : null}
      {agentRun.attempts.some((attempt) => attempt.status === "failed") ? (
        <div className="attempt-list">
          {agentRun.attempts.map((attempt) => (
            <div className="attempt-row" key={attempt.attempt}>
              <span>Attempt {attempt.attempt}</span>
              <Badge status={attempt.status} />
              {attempt.error ? <span className="muted">{attempt.error.message}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      <JsonBlock value={agentRun.validatedOutput} label="Validated output JSON" />
      {agentRun.rawOutput ? <JsonBlock value={agentRun.rawOutput} label="Raw model output" /> : null}
    </div>
  );
}

function ClaimCard({
  claim,
  rebuttals,
  revisions,
  onSelectRound,
}: {
  claim: Claim;
  rebuttals: Rebuttal[];
  revisions: Revision[];
  onSelectRound: (roundId: string) => void;
}) {
  return (
    <article className="claim-card">
      <div className="card-heading">
        <div>
          <span className="claim-id">{claim.id}</span>
          <h4>{claim.text}</h4>
        </div>
        <Badge status={claim.status} />
      </div>
      <div className="tag-row">
        <span className="tag">{claim.claimType}</span>
        <span className="tag">{claim.importance}</span>
        <span className="tag">confidence {(claim.confidence * 100).toFixed(0)}%</span>
      </div>
      <p className="rationale">{claim.rationale}</p>
      {claim.assumptions.length > 0 ? (
        <div className="field-block">
          <span className="field-label">Assumptions</span>
          <PillList values={claim.assumptions} />
        </div>
      ) : null}
      <div className="relationship-row">
        <span>{rebuttals.length} rebuttal{rebuttals.length === 1 ? "" : "s"}</span>
        <span>{revisions.length} revision{revisions.length === 1 ? "" : "s"}</span>
      </div>
      {rebuttals.length > 0 ? (
        <div className="linked-list">
          {rebuttals.map((rebuttal) => (
            <button className="linked-row" key={rebuttal.id} onClick={() => onSelectRound(rebuttal.roundId)}>
              <span className="link-arrow">↳</span>
              <span>
                <strong>Rebuttal</strong>
                <small>{rebuttal.strongestCounterargument}</small>
              </span>
              <span className={`severity severity-${rebuttal.severity}`}>{rebuttal.severity}</span>
            </button>
          ))}
        </div>
      ) : null}
      {revisions.length > 0 ? (
        <div className="linked-list">
          {revisions.map((revision) => (
            <button className="linked-row revision-link" key={revision.id} onClick={() => onSelectRound(revision.roundId)}>
              <span className="link-arrow">↳</span>
              <span>
                <strong>Revision · {revision.action}</strong>
                <small>{revision.after?.text ?? "Claim withdrawn"}</small>
              </span>
              <span className="revision-action">view</span>
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function LineageView({ artifact, onSelectRound }: { artifact: CanonicalRunArtifact; onSelectRound: (roundId: string) => void }) {
  return (
    <Section title="Claim lineage" eyebrow="Judgment change">
      <p className="section-intro">주장이 반박을 거쳐 어떻게 유지·수정·철회되었는지 확인합니다.</p>
      <div className="lineage-flow" aria-label="Claim to rebuttal to revision flow">
        <span className="flow-node flow-claim">Claim</span>
        <span className="flow-arrow">→</span>
        <span className="flow-node flow-rebuttal">Rebuttal</span>
        <span className="flow-arrow">→</span>
        <span className="flow-node flow-revision">Revision</span>
      </div>
      <div className="claim-list">
        {artifact.claims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            rebuttals={artifact.rebuttals.filter((item) => item.targetClaimId === claim.id)}
            revisions={artifact.revisions.filter((item) => item.claimId === claim.id)}
            onSelectRound={onSelectRound}
          />
        ))}
      </div>
      {artifact.rebuttals.some((rebuttal) => !artifact.claims.some((claim) => claim.id === rebuttal.targetClaimId)) ? (
        <div className="warning-box">연결되지 않은 Rebuttal이 있습니다. artifact lineage를 확인하세요.</div>
      ) : null}
    </Section>
  );
}

function InputDetail({ artifact }: { artifact: CanonicalRunArtifact }) {
  const { scenario } = artifact.run;
  return (
    <>
      <Section title={scenario.title} eyebrow="Scenario input">
        <p className="problem-copy">{scenario.problem}</p>
        <div className="field-block">
          <span className="field-label">Context</span>
          <p>{scenario.context || "없음"}</p>
        </div>
        <div className="two-column-fields">
          <div className="field-block">
            <span className="field-label">Goals</span>
            <PillList values={scenario.goals} />
          </div>
          <div className="field-block">
            <span className="field-label">Constraints</span>
            <PillList values={scenario.constraints} />
          </div>
        </div>
        <div className="two-column-fields">
          <div className="field-block">
            <span className="field-label">Known facts</span>
            <PillList values={scenario.knownFacts} />
          </div>
          <div className="field-block">
            <span className="field-label">Assumptions</span>
            <PillList values={scenario.assumptions} />
          </div>
        </div>
      </Section>
      <Section title="Run budget" eyebrow="Limits">
        <div className="budget-grid">
          <Metric label="Claims" value={String(scenario.budget.maxClaims)} />
          <Metric label="Rebuttals" value={String(scenario.budget.maxRebuttals)} />
          <Metric label="Context" value={scenario.budget.maxInputTokens.toLocaleString()} />
          <Metric label="Output" value={scenario.budget.maxOutputTokens.toLocaleString()} />
        </div>
      </Section>
    </>
  );
}

function AnalysisDetail({ agentRun }: { agentRun?: AgentRunRecord }) {
  const output = agentRun?.validatedOutput;
  const analysis = typeof output === "object" && output !== null ? output as Record<string, unknown> : null;
  const claims = Array.isArray(analysis?.claims) ? analysis.claims : [];
  const informationGaps = Array.isArray(analysis?.informationGaps)
    ? analysis.informationGaps.filter((value): value is string => typeof value === "string")
    : [];
  return (
    <>
      <Section title="Analyst output" eyebrow="Independent analysis">
        <AgentRunMeta agentRun={agentRun} />
        {analysis ? (
          <>
            <div className="field-block">
              <span className="field-label">Problem frame</span>
              <p>{typeof analysis.problemFrame === "string" ? analysis.problemFrame : "—"}</p>
            </div>
            <div className="field-block">
              <span className="field-label">Recommendation</span>
              <p>{typeof analysis.recommendation === "string" ? analysis.recommendation : "—"}</p>
            </div>
            <div className="field-block">
              <span className="field-label">Information gaps</span>
              <PillList values={informationGaps} />
            </div>
            <div className="mini-claim-list">
              <span className="field-label">Draft claims · {claims.length}</span>
              {claims.map((claim, index) => (
                <div className="mini-claim" key={`${String(claim)}-${index}`}>
                  {typeof claim === "object" && claim !== null && "text" in claim ? String(claim.text) : String(claim)}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">검증된 분석 output이 없습니다.</p>
        )}
      </Section>
    </>
  );
}

function RebuttalDetail({ artifact, agentRun }: { artifact: CanonicalRunArtifact; agentRun?: AgentRunRecord }) {
  return (
    <>
      <Section title="Falsifier attack" eyebrow="Rebuttal">
        <AgentRunMeta agentRun={agentRun} />
        <div className="rebuttal-list">
          {artifact.rebuttals.map((rebuttal) => (
            <article className="rebuttal-card" key={rebuttal.id}>
              <div className="card-heading">
                <div>
                  <span className="claim-id">{rebuttal.id}</span>
                  <h4>Targets {rebuttal.targetClaimId}</h4>
                </div>
                <span className={`severity severity-${rebuttal.severity}`}>{rebuttal.severity}</span>
              </div>
              <div className="field-block">
                <span className="field-label">Strongest counterargument</span>
                <p>{rebuttal.strongestCounterargument}</p>
              </div>
              <div className="two-column-fields">
                <div className="field-block">
                  <span className="field-label">Failure scenario</span>
                  <p>{rebuttal.failureScenario}</p>
                </div>
                <div className="field-block">
                  <span className="field-label">Disconfirming test</span>
                  <p>{rebuttal.disconfirmingTest}</p>
                </div>
              </div>
              <div className="field-block">
                <span className="field-label">Missing evidence</span>
                <PillList values={rebuttal.missingEvidence} />
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}

function RevisionDetail({ artifact, agentRun }: { artifact: CanonicalRunArtifact; agentRun?: AgentRunRecord }) {
  return (
    <>
      <Section title="Analyst response" eyebrow="Revision">
        <AgentRunMeta agentRun={agentRun} />
        <div className="revision-list">
          {artifact.revisions.map((revision) => (
            <article className="revision-card" key={revision.id}>
              <div className="card-heading">
                <div>
                  <span className="claim-id">{revision.id}</span>
                  <h4>{revision.action}</h4>
                </div>
                <span className="tag">confidence {(revision.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="before-after">
                <div>
                  <span className="field-label">Before</span>
                  <p>{revision.before.text}</p>
                </div>
                <div className="change-arrow">→</div>
                <div>
                  <span className="field-label">After</span>
                  <p>{revision.after?.text ?? "Claim withdrawn"}</p>
                </div>
              </div>
              <div className="field-block">
                <span className="field-label">Rationale</span>
                <p>{revision.rationale}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}

function ClaimNormalizationDetail({ artifact }: { artifact: CanonicalRunArtifact }) {
  return (
    <Section title="Normalized claims" eyebrow="Claim normalization">
      <p className="section-intro">각 주장은 안정적인 ID와 provenance를 갖도록 정규화되었습니다.</p>
      <div className="normalized-list">
        {artifact.claims.map((claim) => (
          <div className="normalized-row" key={claim.id}>
            <span className="claim-id">{claim.id}</span>
            <span>{claim.text}</span>
            <Badge status={claim.status} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function DetailPanel({ artifact, timelineItem }: DetailProps) {
  const agentRun = timelineItem.agentRuns[0];
  switch (timelineItem.round.kind) {
    case "input_normalization":
      return <InputDetail artifact={artifact} />;
    case "independent_analysis":
      return <AnalysisDetail agentRun={agentRun} />;
    case "claim_normalization":
      return <ClaimNormalizationDetail artifact={artifact} />;
    case "rebuttal":
      return <RebuttalDetail artifact={artifact} agentRun={agentRun} />;
    case "revision":
      return <RevisionDetail artifact={artifact} agentRun={agentRun} />;
    default:
      return null;
  }
}

function RunSummaryHeader({ summary, artifact }: { summary: RunSummary; artifact: CanonicalRunArtifact }) {
  const duration = summary.durationMs || 0;
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
        <span>Created {formatTimestamp(summary.createdAt)}</span>
        <span>Completed {formatTimestamp(summary.completedAt)}</span>
      </div>
      <div className="summary-metrics">
        <Metric label="Claims" value={String(summary.claims)} detail={`${summary.revisions} revisions`} />
        <Metric label="Rebuttals" value={String(summary.rebuttals)} detail="targeted attacks" />
        <Metric label="Latency" value={formatDuration(duration)} detail="sum of agent runs" />
        <Metric label="Tokens" value={formatTokens(summary.inputTokens, summary.outputTokens)} detail="local usage" />
        <Metric label="Cost" value="0" detail="local model" />
      </div>
    </header>
  );
}

function Timeline({
  items,
  selectedRoundId,
  onSelect,
}: {
  items: TimelineItem[];
  selectedRoundId: string | null;
  onSelect: (roundId: string) => void;
}) {
  return (
    <nav className="timeline" aria-label="Run execution timeline">
      <div className="timeline-heading">
        <span className="section-eyebrow">Execution trace</span>
        <strong>{items.length} stages</strong>
      </div>
      <div className="timeline-list">
        {items.map((item) => {
          const agentRun = item.agentRuns[0];
          const active = item.round.id === selectedRoundId;
          return (
            <button
              className={`timeline-item ${active ? "is-active" : ""}`}
              key={item.round.id}
              onClick={() => onSelect(item.round.id)}
              aria-current={active ? "step" : undefined}
            >
              <span className={`timeline-dot dot-${statusTone(item.round.status)}`} />
              <span className="timeline-content">
                <span className="timeline-topline">
                  <span className="timeline-index">0{item.round.index + 1}</span>
                  <Badge status={item.round.status} />
                </span>
                <strong>{roundLabels[item.round.kind]}</strong>
                <small>{agentRun ? `${agentRun.agentId} · ${agentRun.attempts.length} attempt${agentRun.attempts.length === 1 ? "" : "s"}` : "normalized record"}</small>
              </span>
              <span className="timeline-chevron">›</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function RunSelector({ runs, selectedRunId, onSelect }: { runs: RunSummary[]; selectedRunId: string | null; onSelect: (runId: string) => void }) {
  return (
    <label className="run-selector">
      <span className="section-eyebrow">Loaded runs</span>
      <select value={selectedRunId ?? ""} onChange={(event) => onSelect(event.target.value)}>
        {runs.map((run) => (
          <option key={run.runId} value={run.runId}>
            {run.title} · {run.provider}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<CanonicalRunArtifact | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
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
      setSelectedRoundId(null);
      return;
    }
    let cancelled = false;
    setLoadingArtifact(true);
    setError(null);
    void loadRunArtifact(selectedRunId)
      .then((nextArtifact) => {
        if (cancelled) {
          return;
        }
        setArtifact(nextArtifact);
        setSelectedRoundId(nextArtifact.rounds[0]?.id ?? null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setArtifact(null);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArtifact(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  const timeline = useMemo(() => (artifact ? buildTimeline(artifact) : []), [artifact]);
  const selectedTimelineItem = timeline.find((item) => item.round.id === selectedRoundId) ?? timeline[0];
  const selectedSummary = runs.find((run) => run.runId === selectedRunId);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">AC</span>
          <div>
            <strong>Agent Council</strong>
            <span>Local run explorer</span>
          </div>
        </div>
        <div className="topbar-actions">
          {runs.length > 0 ? <RunSelector runs={runs} selectedRunId={selectedRunId} onSelect={setSelectedRunId} /> : null}
          <button className="refresh-button" onClick={() => void refreshRuns()} disabled={loadingRuns}>
            {loadingRuns ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="global-error" role="alert">
          <strong>Artifact를 불러오지 못했습니다.</strong>
          <span>{error}</span>
        </div>
      ) : null}

      {loadingRuns && runs.length === 0 ? (
        <EmptyState title="Loading local runs" description="artifacts/runs의 canonical JSON을 읽고 있습니다." />
      ) : runs.length === 0 ? (
        <EmptyState title="아직 실행 결과가 없습니다" description="먼저 `pnpm run council run --scenario ...`을 실행하면 이 화면에서 확인할 수 있습니다." />
      ) : loadingArtifact || !artifact || !selectedSummary || !selectedTimelineItem ? (
        <div className="loading-state">선택한 Run artifact를 불러오는 중…</div>
      ) : (
        <main className="workspace">
          <RunSummaryHeader summary={selectedSummary} artifact={artifact} />
          <div className="workspace-grid">
            <Timeline items={timeline} selectedRoundId={selectedTimelineItem.round.id} onSelect={setSelectedRoundId} />
            <div className="detail-column">
              <DetailPanel artifact={artifact} timelineItem={selectedTimelineItem} />
              <LineageView artifact={artifact} onSelectRound={setSelectedRoundId} />
              <Section title="Trace events" eyebrow={`${artifact.traceEvents.length} events`}>
                <div className="trace-list">
                  {artifact.traceEvents.map((event) => (
                    <div className="trace-row" key={event.id}>
                      <span className="trace-sequence">{String(event.sequence).padStart(2, "0")}</span>
                      <span className="trace-type">{event.type}</span>
                      <span className="muted">{formatTimestamp(event.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
