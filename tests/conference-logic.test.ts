import { describe, expect, it } from "vitest";

import { buildConferenceResult, isValidPlateSequence, normalizeSequence } from "../lib/conference-logic";

describe("conference sequence logic", () => {
  it("normalizes a sequence received with spaces and punctuation", () => {
    expect(normalizeSequence(" abc-1d23 ")).toBe("ABC1D23");
    expect(isValidPlateSequence("ABC1D23")).toBe(true);
  });

  it("approves identical, confident sequences", () => {
    const result = buildConferenceResult({ sheet: "IRR4F21", plate: "IRR4F21", sheetConfidence: 98, plateConfidence: 97 });
    expect(result.status).toBe("approved");
    expect(result.differences).toBe(0);
    expect(result.characters.every((character) => character.state === "match")).toBe(true);
  });

  it("identifies each divergent character", () => {
    const result = buildConferenceResult({ sheet: "CLR9A18", plate: "CLR9A81", sheetConfidence: 96, plateConfidence: 95 });
    expect(result.status).toBe("divergent");
    expect(result.differences).toBe(2);
    expect(result.characters.filter((character) => character.state === "different").map((character) => character.position)).toEqual([6, 7]);
  });

  it("requires a new photo when the read is invalid or low confidence", () => {
    expect(buildConferenceResult({ sheet: "ABC1D23", plate: "", sheetConfidence: 99, plateConfidence: 0 }).status).toBe("inconclusive");
    expect(buildConferenceResult({ sheet: "ABC1D23", plate: "ABC1D23", sheetConfidence: 64, plateConfidence: 98 }).status).toBe("inconclusive");
  });
});
