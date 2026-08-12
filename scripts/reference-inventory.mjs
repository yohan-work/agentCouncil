import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const referenceRoot = join(projectRoot, "refer", "MatrAIx-Persona-8B-main");
const outputPath = join(projectRoot, "docs", "reference-inventory.csv");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const absolutePath = join(directory, entry.name);
      return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
    });
}

function classify(sourcePath) {
  if (sourcePath === "LICENSE") {
    return ["REUSE", "license-notice", "프로젝트 루트 MIT 고지"];
  }
  if (sourcePath.startsWith("persona/schema/")) {
    return ["REUSE", "persona-source-schema", "Persona taxonomy와 dimension 계약"];
  }
  if (sourcePath.startsWith("persona/datasets/matraix-persona-dev-sample/")) {
    return ["REUSE", "persona-source-record", "선별 가능한 200개 개발 Persona sample"];
  }
  if (sourcePath.startsWith("application/task-spec/")) {
    return ["REUSE", "evaluation-reference", "Task Spec과 structured reporting 계약"];
  }
  if (
    sourcePath.startsWith("application/tasks/") ||
    sourcePath.startsWith("examples/tasks/") ||
    sourcePath.startsWith("docs/persona/") ||
    sourcePath.startsWith("docs/application/") ||
    /^src\/matraix\/(persona_|task_catalog)/u.test(sourcePath) ||
    (/^tests\//u.test(sourcePath) && /(persona|task|report|schema|eval)/u.test(sourcePath))
  ) {
    return ["ADAPT", "design-or-test-reference", "구조와 실패 사례만 자체 구현에 반영"];
  }
  if (sourcePath.startsWith("apps/viewer/") || sourcePath.startsWith("application/playground/")) {
    return ["IGNORE", "none", "기존 UI와 Playground runtime은 초기 범위 밖"];
  }
  if (sourcePath.startsWith("environment/") || sourcePath.startsWith("configs/")) {
    return ["IGNORE", "none", "Harbor·Docker·computer-use 실행 환경은 초기 범위 밖"];
  }
  if (sourcePath.startsWith("packages/")) {
    return ["IGNORE", "none", "독립 reference package는 런타임에 사용하지 않음"];
  }
  if (sourcePath.startsWith("persona/synthesis/") || sourcePath.startsWith("persona/post_process/")) {
    return ["IGNORE", "none", "Persona 생성·1M pipeline은 초기 범위 밖"];
  }
  return ["IGNORE", "none", "Phase 0~2의 제품 계약에 필요하지 않음"];
}

function licenseFor(sourcePath) {
  return sourcePath === "packages/rewardkit/LICENSE" || sourcePath.startsWith("packages/rewardkit/")
    ? "Apache-2.0"
    : "MIT";
}

function csv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const files = walk(referenceRoot).filter((absolutePath) => statSync(absolutePath).isFile());
const rows = files.map((absolutePath) => {
  const sourcePath = relative(referenceRoot, absolutePath).replaceAll("\\", "/");
  const [classification, target, reason] = classify(sourcePath);
  const sha256 = createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
  return { sourcePath, classification, reason, license: licenseFor(sourcePath), target, sha256 };
});

const header = ["source_path", "classification", "reason", "license", "internal_target", "sha256"];
const lines = [
  header.map(csv).join(","),
  ...rows.map((row) =>
    [row.sourcePath, row.classification, row.reason, row.license, row.target, row.sha256]
      .map(csv)
      .join(","),
  ),
];

writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

const summary = rows.reduce(
  (counts, row) => ({ ...counts, [row.classification]: counts[row.classification] + 1 }),
  { REUSE: 0, ADAPT: 0, IGNORE: 0 },
);

process.stdout.write(`${JSON.stringify({ outputPath, files: rows.length, ...summary })}\n`);
