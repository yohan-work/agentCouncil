PRAGMA foreign_keys = ON;

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  scenario_json TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  limits_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  error_json TEXT,
  artifact_path TEXT
);

CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  error_json TEXT,
  UNIQUE(run_id, round_index)
);

CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  status TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  raw_output TEXT,
  validated_output_json TEXT,
  attempts_json TEXT NOT NULL,
  usage_json TEXT,
  error_json TEXT,
  started_at TEXT,
  completed_at TEXT
);
CREATE INDEX agent_runs_run_idx ON agent_runs(run_id);

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  author_agent_id TEXT NOT NULL,
  text TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  evidence_refs_json TEXT NOT NULL,
  assumptions_json TEXT NOT NULL,
  confidence_ppm INTEGER NOT NULL,
  importance TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL,
  parent_claim_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX claims_run_idx ON claims(run_id);

CREATE TABLE rebuttals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  target_claim_id TEXT NOT NULL REFERENCES claims(id),
  author_agent_id TEXT NOT NULL,
  strongest_counterargument TEXT NOT NULL,
  failure_scenario TEXT NOT NULL,
  missing_evidence_json TEXT NOT NULL,
  disconfirming_test TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence_ppm INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX rebuttals_run_idx ON rebuttals(run_id);

CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  claim_id TEXT NOT NULL REFERENCES claims(id),
  rebuttal_id TEXT NOT NULL REFERENCES rebuttals(id),
  author_agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT,
  rationale TEXT NOT NULL,
  confidence_ppm INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX revisions_run_idx ON revisions(run_id);

CREATE TABLE trace_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE(run_id, sequence)
);

CREATE TABLE prompt_versions (
  key TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  prompt_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
