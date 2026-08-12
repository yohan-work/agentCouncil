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

  it("loads a run, shows the pixel scene, and opens selected details", async () => {
    render(<App />);

    expect((await screen.findAllByText("일부 Figma node를 확인하지 못한 구현 결정")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("pixel-scene")).toBeTruthy();
    expect(screen.getByText("Council floor")).toBeTruthy();
    expect(screen.getByText("Agent들이 문제를 풀고 있는 현장")).toBeTruthy();

    const analystButton = screen.getByRole("button", { name: /Analyst, 구조화/u });
    fireEvent.click(analystButton);

    await waitFor(() => {
      expect(screen.getByText("Analyst details")).toBeTruthy();
      expect(screen.getByText("Execution phases")).toBeTruthy();
    });

    const relationshipButton = screen.getByRole("button", { name: /claim claim_/i });
    fireEvent.click(relationshipButton);
    expect(screen.getByText("Selected relationship")).toBeTruthy();
    expect(screen.getByText(/실패 조건:/u)).toBeTruthy();
  });

  it("shows an actionable empty state when no artifacts exist", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ runs: [] }) })));
    render(<App />);
    expect(await screen.findByText("아직 실행 결과가 없습니다")).toBeTruthy();
    expect(screen.getByText(/pnpm run council run/u)).toBeTruthy();
  });
});
