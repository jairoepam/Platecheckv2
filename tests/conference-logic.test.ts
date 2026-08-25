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

  it("approves reads equivalent after resolving position-based lookalikes", () => {
    const numberLetterPairs = buildConferenceResult({ sheet: "AB11023", plate: "ABI1O23", sheetConfidence: 61, plateConfidence: 99 });
    const bAndSPairs = buildConferenceResult({ sheet: "AB518SB", plate: "ABS1B58", sheetConfidence: 70, plateConfidence: 90 });

    expect(numberLetterPairs.status).toBe("approved");
    expect(numberLetterPairs.sheet).toBe("ABI1O23");
    expect(bAndSPairs.status).toBe("approved");
    expect(bAndSPairs.sheet).toBe("ABS1B58");
  });

  it("does not consider C and G equivalent because both are valid letters", () => {
    const result = buildConferenceResult({ sheet: "CAC1C23", plate: "GAC1C23", sheetConfidence: 99, plateConfidence: 99 });
    expect(result.status).toBe("divergent");
    expect(result.differences).toBe(1);
  });

  it("identifies each divergent character", () => {
    const result = buildConferenceResult({ sheet: "CLR9A18", plate: "CLR9A81", sheetConfidence: 96, plateConfidence: 95 });
    expect(result.status).toBe("divergent");
    expect(result.differences).toBe(2);
    expect(result.characters.filter((character) => character.state === "different").map((character) => character.position)).toEqual([6, 7]);
  });

  it("requires a new photo when the sequence is invalid or when a difference has low confidence", () => {
    expect(buildConferenceResult({ sheet: "ABC1D23", plate: "", sheetConfidence: 99, plateConfidence: 0 }).status).toBe("inconclusive");
    expect(buildConferenceResult({ sheet: "ABC1D23", plate: "ABC1D23", sheetConfidence: 64, plateConfidence: 98 }).status).toBe("approved");
    expect(buildConferenceResult({ sheet: "ABC1D23", plate: "ABC1D24", sheetConfidence: 64, plateConfidence: 98 }).status).toBe("inconclusive");
  });
});
