import { describe, expect, it } from "vitest";
import { createInitialGameSession } from "./gameSession";
import type { GameSessionState, GameUiState } from "./gameSession";
import { handleGameCommand } from "./gameCommandHandler";
import type { GameCommand } from "./gameProtocol";

const createContext = (
  sessionChanges: Partial<GameSessionState> = {},
  uiChanges: Partial<GameUiState> = {},
) => ({
  session: {
    ...createInitialGameSession(),
    id: "session-1",
    lastCommandId: 2,
    gameStatus: "playing" as const,
    currentCountryCode: "CAN",
    missionId: "session-1:1",
    ...sessionChanges,
  },
  ui: {
    feedback: null,
    clickedName: null,
    clickedCode: null,
    streakLost: null,
    ...uiChanges,
  },
});

const createCommand = (
  changes: Partial<GameCommand> = {},
): GameCommand => ({
  type: "answer",
  answerCountryCode: "CAN",
  sessionId: "session-1",
  commandId: 3,
  missionId: "session-1:1",
  ...changes,
});

describe("handleGameCommand", () => {
  it("rejects malformed commands without changing the session", () => {
    const context = createContext();
    const result = handleGameCommand(
      { type: "answer", commandId: Number.MAX_SAFE_INTEGER + 1 },
      context,
    );

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.event.reason).toBe("malformed");
    expect(result.session).toBe(context.session);
    expect(JSON.parse(JSON.stringify(result.event))).toEqual(result.event);
  });

  it.each([
    ["stale-session", { sessionId: "old-session" }],
    ["stale-mission", { missionId: "old-mission" }],
    ["duplicate", { commandId: 2 }],
  ] as const)("rejects %s commands without changing state", (reason, changes) => {
    const context = createContext();
    const result = handleGameCommand(createCommand(changes), context);

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.event.reason).toBe(reason);
    expect(result.session).toBe(context.session);
  });

  it("rejects commands when the session is inactive", () => {
    const context = createContext({ gameStatus: "finished" });
    const result = handleGameCommand(createCommand(), context);

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.event.reason).toBe("inactive");
    expect(result.session).toBe(context.session);
  });

  it("resolves answer correctness from the country code and records the command", () => {
    const context = createContext({ streak: 2 });
    const result = handleGameCommand(
      createCommand(),
      context,
      { clickedName: "Canada", clickedCode: "CAN" },
    );

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.event.transition).toBe("outcome");
    expect(result.session).toMatchObject({
      score: 30,
      streak: 3,
      totalAttempts: 1,
      correctAttempts: 1,
      lastCommandId: 3,
    });
    expect(result.ui).toMatchObject({
      feedback: "correct",
      clickedName: "Canada",
      clickedCode: "CAN",
    });
    expect(JSON.parse(JSON.stringify(result.event))).toEqual(result.event);
  });

  it("treats an unresolved map answer as incorrect and ignores incorrect clicks after reveal", () => {
    const context = createContext({ revealed: true });
    const result = handleGameCommand(
      createCommand({
        answerCountryCode: null,
        ignoreIncorrectWhenRevealed: true,
      }),
      context,
    );

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.event.transition).toBe("ignore");
    expect(result.session.totalAttempts).toBe(0);
    expect(result.session.lastCommandId).toBe(3);
    expect(result.effects).toEqual([]);
  });

  it("applies mode-specific reveal behavior and accepts skip commands", () => {
    const identifyContext = createContext({ streak: 2 });
    const revealResult = handleGameCommand(
      createCommand({ type: "reveal" }),
      identifyContext,
    );

    expect(revealResult.accepted).toBe(true);
    if (!revealResult.accepted) return;
    expect(revealResult.session).toMatchObject({
      revealed: true,
      streak: 0,
      lastCommandId: 3,
    });
    expect(revealResult.ui.streakLost).toBe(2);

    const reverseResult = handleGameCommand(
      createCommand({ type: "reveal" }),
      createContext({ mode: "reverse", streak: 2 }),
    );
    expect(reverseResult.accepted).toBe(true);
    if (!reverseResult.accepted) return;
    expect(reverseResult.session.streak).toBe(2);

    const skipResult = handleGameCommand(
      createCommand({ type: "skip" }),
      createContext(),
    );
    expect(skipResult.accepted).toBe(true);
    if (!skipResult.accepted) return;
    expect(skipResult.session).toMatchObject({
      revealed: true,
      streak: 0,
      lastCommandId: 3,
    });
    expect(skipResult.effects).toContainEqual({
      type: "schedule-advance",
      delayMs: 1500,
    });
  });
});
