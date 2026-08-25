export type ConferenceStatus = "approved" | "divergent" | "inconclusive";

export type CharacterComparison = {
  position: number;
  sheet: string;
  plate: string;
  state: "match" | "different" | "unknown";
};

export type ConferenceResult = {
  status: ConferenceStatus;
  sheet: string | null;
  plate: string | null;
  confidence: number;
  differences: number;
  characters: CharacterComparison[];
  message: string;
};

export type ExtractedSequences = {
  sheet?: unknown;
  plate?: unknown;
  sheetConfidence?: unknown;
  plateConfidence?: unknown;
};

const PLATE_PATTERN = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function normalizeSequence(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function isValidPlateSequence(value: string): boolean {
  return PLATE_PATTERN.test(value);
}

function normalizedConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(Math.max(0, Math.min(100, parsed)));
}

function unknownCharacters(sheet: string, plate: string): CharacterComparison[] {
  return Array.from({ length: 7 }, (_, index) => ({
    position: index + 1,
    sheet: sheet[index] ?? "–",
    plate: plate[index] ?? "–",
    state: "unknown" as const,
  }));
}

export function buildConferenceResult(extraction: ExtractedSequences): ConferenceResult {
  const sheet = normalizeSequence(extraction.sheet);
  const plate = normalizeSequence(extraction.plate);
  const sheetConfidence = normalizedConfidence(extraction.sheetConfidence);
  const plateConfidence = normalizedConfidence(extraction.plateConfidence);
  const confidence = Math.min(sheetConfidence, plateConfidence);

  if (!isValidPlateSequence(sheet) || !isValidPlateSequence(plate) || confidence < 65) {
    return {
      status: "inconclusive",
      sheet: isValidPlateSequence(sheet) ? sheet : null,
      plate: isValidPlateSequence(plate) ? plate : null,
      confidence,
      differences: 0,
      characters: unknownCharacters(sheet, plate),
      message:
        "Não foi possível concluir a leitura desta foto. Tente novamente com os dois itens enquadrados e bem iluminados.",
    };
  }

  const characters = Array.from({ length: 7 }, (_, index) => ({
    position: index + 1,
    sheet: sheet[index],
    plate: plate[index],
    state: (sheet[index] === plate[index] ? "match" : "different") as "match" | "different",
  }));
  const differences = characters.filter((character) => character.state === "different").length;

  if (differences === 0) {
    return {
      status: "approved",
      sheet,
      plate,
      confidence,
      differences,
      characters,
      message: "As duas sequências são idênticas.",
    };
  }

  return {
    status: "divergent",
    sheet,
    plate,
    confidence,
    differences,
    characters,
    message: `${differences} ${differences === 1 ? "posição diferente" : "posições diferentes"}.`,
  };
}
