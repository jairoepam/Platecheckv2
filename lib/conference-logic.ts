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
  whAmbiguous?: unknown;
  sheetVisible?: unknown;
  plateVisible?: unknown;
  distinctItems?: unknown;
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

function preserveSequenceCharacters(characters: CharacterComparison[], sheet: string, plate: string) {
  return characters.map((character, index) => ({
    ...character,
    sheet: character.sheet === "–" ? sheet[index] ?? "–" : character.sheet,
    plate: character.plate === "–" ? plate[index] ?? "–" : character.plate,
  }));
}

export function buildConferenceResult(extraction: ExtractedSequences): ConferenceResult {
  const sheet = canonicalizeMercosurSequence(extraction.sheet);
  const plate = canonicalizeMercosurSequence(extraction.plate);
  const sheetConfidence = normalizedConfidence(extraction.sheetConfidence, 75);
  const plateConfidence = normalizedConfidence(extraction.plateConfidence, 75);
  const confidence = Math.min(sheetConfidence, plateConfidence);
  const whAmbiguous = extraction.whAmbiguous === true;
  const sheetVisible = extraction.sheetVisible === true;
  const plateVisible = extraction.plateVisible === true;
  const distinctItems = extraction.distinctItems === true;
  const bothItemsConfirmed = sheetVisible && plateVisible && distinctItems;

  if (!bothItemsConfirmed || !isValidPlateSequence(sheet) || !isValidPlateSequence(plate) || whAmbiguous) {
    const missingItemMessage = !sheetVisible && !plateVisible
      ? "A folha impressa e a placa física precisam aparecer juntas na mesma foto."
      : !sheetVisible
        ? "A folha impressa não foi identificada. Fotografe novamente com a folha e a placa juntas."
        : !plateVisible
          ? "A placa física não foi identificada. Fotografe novamente com a folha e a placa juntas."
          : !distinctItems
            ? "Não foi possível confirmar dois itens diferentes. Fotografe a folha e a placa juntas, sem sobreposição."
            : "Não foi possível concluir a leitura desta foto. Tente novamente com os dois itens enquadrados e bem iluminados.";
    return {
      status: "inconclusive",
      sheet: sheetVisible && isValidPlateSequence(sheet) ? sheet : null,
      plate: plateVisible && isValidPlateSequence(plate) ? plate : null,
      confidence,
      differences: 0,
      characters: preserveSequenceCharacters(
        unknownCharacters(sheetVisible ? sheet : "", plateVisible ? plate : ""),
        sheetVisible ? sheet : "",
        plateVisible ? plate : "",
      ),
      message: whAmbiguous
        ? "A leitura encontrou dúvida entre W e H. Fotografe novamente para evitar uma aprovação incorreta."
        : missingItemMessage,
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

/**
 * Rebaixa uma leitura que seria aprovada quando a confirmação extra de W/H
 * falha. A sequência original e o caractere lido permanecem visíveis para
 * diagnóstico, mas as posições que dependem de W/H deixam de ser confirmadas.
 */
export function markWhVerificationUnavailable(result: ConferenceResult): ConferenceResult {
  const characters = preserveSequenceCharacters(result.characters, result.sheet ?? "", result.plate ?? "").map((character, index) => {
    const dependsOnWh = /[WH]/.test(result.sheet?.[index] ?? "") || /[WH]/.test(result.plate?.[index] ?? "");
    return dependsOnWh ? { ...character, state: "unknown" as const } : character;
  });

  return {
    ...result,
    status: "inconclusive",
    characters,
    message: "Não foi possível confirmar com segurança os caracteres W/H. Faça uma nova foto para evitar uma aprovação incorreta.",
  };
}
