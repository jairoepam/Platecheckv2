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
const MERCOSUR_POSITION_TYPES = ["letter", "letter", "letter", "digit", "letter", "digit", "digit"] as const;
const LETTER_LOOKALIKES: Record<string, string> = { "1": "I", "0": "O", "8": "B", "5": "S" };
const DIGIT_LOOKALIKES: Record<string, string> = { I: "1", O: "0", B: "8", S: "5" };

export function normalizeSequence(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Corrige apenas ambiguidades que a própria posição da placa Mercosul resolve.
 * C e G permanecem distintos porque ambos são letras válidas na mesma posição.
 */
export function canonicalizeMercosurSequence(value: unknown): string {
  return Array.from(normalizeSequence(value))
    .map((character, index) => {
      const expectedType = MERCOSUR_POSITION_TYPES[index];
      if (expectedType === "letter") return LETTER_LOOKALIKES[character] ?? character;
      if (expectedType === "digit") return DIGIT_LOOKALIKES[character] ?? character;
      return character;
    })
    .join("");
}

export function isValidPlateSequence(value: string): boolean {
  return PLATE_PATTERN.test(value);
}

function normalizedConfidence(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
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
  const sheet = canonicalizeMercosurSequence(extraction.sheet);
  const plate = canonicalizeMercosurSequence(extraction.plate);
  const sheetConfidence = normalizedConfidence(extraction.sheetConfidence, 75);
  const plateConfidence = normalizedConfidence(extraction.plateConfidence, 75);
  const confidence = Math.min(sheetConfidence, plateConfidence);

  if (!isValidPlateSequence(sheet) || !isValidPlateSequence(plate)) {
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

  if (confidence < 65) {
    return {
      status: "inconclusive",
      sheet,
      plate,
      confidence,
      differences,
      characters: unknownCharacters(sheet, plate),
      message:
        "A leitura encontrou diferenças, mas a confiança está baixa. Confira a foto e faça uma nova captura se necessário.",
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
