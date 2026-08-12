// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../apps/web/src/App";

import { makeWebFixtureArtifact } from "./fixture";

describe("Run explorer", () => {
  const artifact = makeWebFixtureArtifact();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const path = String(input);
        if (path === "/api/runs") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              runs: [{
                runId: artifact.run.id,
                scenarioId: artifact.run.scenarioId,
                title: artifact.run.scenario.title,
                status: artifact.run.status,
                provider: artifact.run.provider,
                model: artifact.run.model,
                createdAt: artifact.run.createdAt,
                startedAt: artifact.run.startedAt,
                completedAt: artifact.run.completedAt,
                claims: artifact.claims.length,
                rebuttals: artifact.rebuttals.length,
                revisions: artifact.revisions.length,
                durationMs: 2_000,
                inputTokens: 310,
                outputTokens: 127,
              }],
            }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => artifact });
      }),
    );
  });

  it("loads a run, shows the timeline, and opens the rebuttal detail", async () => {
    render(<App />);

    expect((await screen.findAllByText("일부 Figma node를 확인하지 못한 구현 결정")).length).toBeGreaterThan(0);
    expect(screen.getByText("Execution trace")).toBeTruthy();
    expect(screen.getByText("5 stages")).toBeTruthy();

    const rebuttalStage = screen.getAllByRole("button").find((button) => button.textContent?.includes("Rebuttal"));
    expect(rebuttalStage).toBeTruthy();
    fireEvent.click(rebuttalStage!);

    await waitFor(() => {
      expect(screen.getByText("Falsifier attack")).toBeTruthy();
      expect(screen.getByText("Strongest counterargument")).toBeTruthy();
    });
  });

  it("shows an actionable empty state when no artifacts exist", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ runs: [] }) })));
    render(<App />);
    expect(await screen.findByText("아직 실행 결과가 없습니다")).toBeTruthy();
    expect(screen.getByText(/pnpm run council run/u)).toBeTruthy();
  });
});
