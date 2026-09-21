import { describe, expect, it } from "vitest";

import { buildConferenceResult, isValidPlateSequence, markWhVerificationUnavailable, normalizeSequence, shouldVerifyWh } from "../lib/conference-logic";

describe("conference sequence logic", () => {
  const bothItems = { sheetVisible: true, plateVisible: true, distinctItems: true };

  it("normalizes a sequence received with spaces and punctuation", () => {
    expect(normalizeSequence(" abc-1d23 ")).toBe("ABC1D23");
    expect(isValidPlateSequence("ABC1D23")).toBe(true);
  });

  it("approves identical, confident sequences", () => {
    const result = buildConferenceResult({ ...bothItems, sheet: "IRR4F21", plate: "IRR4F21", sheetConfidence: 98, plateConfidence: 97 });
    expect(result.status).toBe("approved");
    expect(result.differences).toBe(0);
    expect(result.characters.every((character) => character.state === "match")).toBe(true);
  });

  it("approves reads equivalent after resolving position-based lookalikes", () => {
    const numberLetterPairs = buildConferenceResult({ ...bothItems, sheet: "AB11023", plate: "ABI1O23", sheetConfidence: 61, plateConfidence: 99 });
    const bAndSPairs = buildConferenceResult({ ...bothItems, sheet: "AB518SB", plate: "ABS1B58", sheetConfidence: 70, plateConfidence: 90 });

    expect(numberLetterPairs.status).toBe("approved");
    expect(numberLetterPairs.sheet).toBe("ABI1O23");
    expect(bAndSPairs.status).toBe("approved");
    expect(bAndSPairs.sheet).toBe("ABS1B58");
  });

  it("does not consider C and G equivalent because both are valid letters", () => {
    const result = buildConferenceResult({ ...bothItems, sheet: "CAC1C23", plate: "GAC1C23", sheetConfidence: 99, plateConfidence: 99 });
    expect(result.status).toBe("divergent");
    expect(result.differences).toBe(1);
  });

  it("never considers W and H equivalent", () => {
    const result = buildConferenceResult({ ...bothItems, sheet: "UPW0A08", plate: "UPH0A08", sheetConfidence: 99, plateConfidence: 99, whAmbiguous: false });
    expect(result.status).toBe("divergent");
    expect(result.differences).toBe(1);
    expect(result.characters[2].state).toBe("different");
  });

  it("approves identical W sequences without an unnecessary second verification", () => {
    const result = buildConferenceResult({ ...bothItems, sheet: "ELW4C33", plate: "ELW4C33", sheetConfidence: 98, plateConfidence: 98, whAmbiguous: false });

    expect(result.status).toBe("approved");
    expect(shouldVerifyWh(result)).toBe(false);
    expect(result.characters[2]).toMatchObject({ sheet: "W", plate: "W", state: "match" });
  });

  it("blocks approval when the reader reports W/H ambiguity", () => {
    const result = buildConferenceResult({ ...bothItems, sheet: "UPH0A08", plate: "UPH0A08", sheetConfidence: 88, plateConfidence: 88, whAmbiguous: true });
    expect(result.status).toBe("inconclusive");
    expect(result.message).toContain("W e H");
    expect(result.characters[2]).toMatchObject({ sheet: "H", plate: "H", state: "unknown" });
    expect(shouldVerifyWh(result)).toBe(true);
  });

  it("keeps W visible when the extra verification is unavailable", () => {
    const approved = buildConferenceResult({ ...bothItems, sheet: "DWV5B70", plate: "DWV5B70", sheetConfidence: 98, plateConfidence: 98, whAmbiguous: false });
    const result = markWhVerificationUnavailable(approved);

    expect(result.status).toBe("inconclusive");
    expect(result.characters[1]).toMatchObject({ sheet: "W", plate: "W", state: "unknown" });
  });

  it("identifies each divergent character", () => {
    const result = buildConferenceResult({ ...bothItems, sheet: "CLR9A18", plate: "CLR9A81", sheetConfidence: 96, plateConfidence: 95 });
    expect(result.status).toBe("divergent");
    expect(result.differences).toBe(2);
    expect(result.characters.filter((character) => character.state === "different").map((character) => character.position)).toEqual([6, 7]);
  });

  it("requires a new photo only when one of the sequences is invalid", () => {
    expect(buildConferenceResult({ ...bothItems, sheet: "ABC1D23", plate: "", sheetConfidence: 99, plateConfidence: 0 }).status).toBe("inconclusive");
    expect(buildConferenceResult({ ...bothItems, sheet: "ABC1D23", plate: "ABC1D23", sheetConfidence: 64, plateConfidence: 98 }).status).toBe("approved");
    expect(buildConferenceResult({ ...bothItems, sheet: "ABC1D23", plate: "ABC1D24", sheetConfidence: 64, plateConfidence: 98 }).status).toBe("divergent");
  });

  it("never approves when only the physical plate is visible", () => {
    const result = buildConferenceResult({
      sheet: "ABC1D23",
      plate: "ABC1D23",
      sheetVisible: false,
      plateVisible: true,
      distinctItems: false,
      sheetConfidence: 90,
      plateConfidence: 99,
    });
    expect(result.status).toBe("inconclusive");
    expect(result.sheet).toBeNull();
  });

  it("never approves when only the printed sheet is visible", () => {
    const result = buildConferenceResult({
      sheet: "ABC1D23",
      plate: "ABC1D23",
      sheetVisible: true,
      plateVisible: false,
      distinctItems: false,
      sheetConfidence: 99,
      plateConfidence: 90,
    });
    expect(result.status).toBe("inconclusive");
    expect(result.plate).toBeNull();
  });

  it("requires two distinct visible items even when both strings are valid", () => {
    const result = buildConferenceResult({
      sheet: "ABC1D23",
      plate: "ABC1D23",
      sheetVisible: true,
      plateVisible: true,
      distinctItems: false,
      sheetConfidence: 99,
      plateConfidence: 99,
    });
    expect(result.status).toBe("inconclusive");
  });
});
