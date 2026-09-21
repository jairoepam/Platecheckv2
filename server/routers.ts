import { z } from "zod";

import { buildConferenceResult } from "../lib/conference-logic";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const ANALYSIS_SCHEMA = z.object({
  imageBase64: z.string().min(100).max(6_000_000),
  plateCropBase64: z.string().min(100).max(4_000_000).optional(),
  sheetCropBase64: z.string().min(100).max(4_000_000).optional(),
  knownSheet: z.string().min(7).max(7).optional(),
  knownPlate: z.string().min(7).max(7).optional(),
  verifyWh: z.boolean().optional(),
});

const COMMON_RULES = `Antes de ler, confirme dois objetos físicos diferentes na mesma foto: (1) uma folha/documento do sistema, com contexto de papel e outros campos ou textos; e (2) uma placa Mercosul física, com formato de placa, faixa azul e caracteres grandes. Marque sheetVisible como true somente quando a folha real estiver visível. Marque plateVisible como true somente quando a placa física real estiver visível. Marque distinctItems como true somente quando forem claramente dois objetos diferentes. Nunca copie, repita ou deduza a sequência de um item para preencher o outro. Se houver apenas folha, plateVisible deve ser false e plate deve ficar vazio. Se houver apenas placa, sheetVisible deve ser false e sheet deve ficar vazio. A sequência segue obrigatoriamente o padrão ABC1D23: letras nas posições 1, 2, 3 e 5; números nas posições 4, 6 e 7. Ignore outros textos, números, códigos e datas. Examine com atenção 1/I, 0/O, 8/B e 5/S e use o tipo esperado na posição. G e C são letras válidas e distintas; nunca trate G e C como iguais. W e H também são letras distintas e nunca equivalentes: W possui traços diagonais formando vales; H possui duas hastes e uma barra horizontal. Leia folha e placa de forma independente e nunca altere uma leitura para fazê-la coincidir com a outra. Se existir qualquer dúvida visual entre W e H em qualquer item, marque whAmbiguous como true. A sequência da folha pode estar preenchida à mão: leia algarismos manuscritos e use o padrão da placa para decidir o melhor caractere. Não deixe um campo vazio apenas por o algarismo ser manuscrito; só devolva vazio se ele realmente não puder ser distinguido.`;

const FULL_EXTRACTION_PROMPT = `Você é um leitor preciso de placas Mercosul brasileiras. Receberá uma única fotografia com uma folha impressa do sistema e uma placa Mercosul física. Leia as duas sequências de 7 caracteres, uma na folha e uma na placa.

${COMMON_RULES} Se não houver leitura suficiente de algum item, devolva string vazia e confiança baixa.`;

const PLATE_FALLBACK_PROMPT = `Você é um leitor preciso de placas Mercosul brasileiras. Receberá um recorte ampliado da metade inferior de uma foto, contendo a placa Mercosul física. Leia somente os 7 caracteres da placa física.

${COMMON_RULES} Se não houver leitura suficiente, devolva string vazia e confiança baixa.`;

const FOCUSED_EXTRACTION_PROMPT = `Você é um leitor de conferência visual. Receberá dois recortes da mesma fotografia: um recorte da folha impressa e um recorte da placa Mercosul física. Leia a melhor sequência de 7 caracteres em cada recorte, mesmo quando a folha tiver caracteres manuscritos ou quando houver um caractere propositalmente diferente.

${COMMON_RULES} Não deixe ambos vazios se houver qualquer sequência legível. Preserve a diferença real entre os itens.`;

const WH_VERIFICATION_PROMPT = `Você receberá dois recortes de objetos que já foram confirmados em uma única foto: primeiro a folha impressa e depois a placa Mercosul física. Verifique somente as posições indicadas, distinguindo W de H. W possui traços diagonais formando vales; H possui duas hastes e uma barra horizontal. Leia os dois recortes independentemente e não tente fazer os caracteres coincidirem. Retorne exatamente uma entrada para cada posição indicada. Se algum caractere não estiver nítido, marque ambiguous como true.`;

const FULL_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "conference_sequences",
    strict: true,
    schema: {
      type: "object",
      properties: {
        sheet: { type: "string" },
        plate: { type: "string" },
        sheetConfidence: { type: "integer", minimum: 0, maximum: 100 },
        plateConfidence: { type: "integer", minimum: 0, maximum: 100 },
        whAmbiguous: { type: "boolean" },
        sheetVisible: { type: "boolean" },
        plateVisible: { type: "boolean" },
        distinctItems: { type: "boolean" },
      },
      required: ["sheet", "plate", "sheetConfidence", "plateConfidence", "whAmbiguous", "sheetVisible", "plateVisible", "distinctItems"],
      additionalProperties: false,
    },
  },
};

const PLATE_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "plate_sequence",
    strict: true,
    schema: {
      type: "object",
      properties: {
        plate: { type: "string" },
        plateConfidence: { type: "integer", minimum: 0, maximum: 100 },
        whAmbiguous: { type: "boolean" },
        plateVisible: { type: "boolean" },
      },
      required: ["plate", "plateConfidence", "whAmbiguous", "plateVisible"],
      additionalProperties: false,
    },
  },
};

const WH_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "wh_verification",
    strict: true,
    schema: {
      type: "object",
      properties: {
        positions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              position: { type: "integer", minimum: 1, maximum: 7 },
              sheetCharacter: { type: "string", enum: ["W", "H"] },
              plateCharacter: { type: "string", enum: ["W", "H"] },
              ambiguous: { type: "boolean" },
            },
            required: ["position", "sheetCharacter", "plateCharacter", "ambiguous"],
            additionalProperties: false,
          },
        },
        ambiguous: { type: "boolean" },
      },
      required: ["positions", "ambiguous"],
      additionalProperties: false,
    },
  },
};

function parseModelJson(content: unknown): Record<string, unknown> {
  if (typeof content !== "string" || !content) return {};
  try {
    const trimmed = content.trim();
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    const json = firstBrace >= 0 && lastBrace > firstBrace ? trimmed.slice(firstBrace, lastBrace + 1) : trimmed;
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function logUnusableResponse(label: string, response: Awaited<ReturnType<typeof invokeLLM>>) {
  const choice = response.choices[0];
  console.warn(`[conference] ${label} response did not contain usable JSON`, {
    finishReason: choice?.finish_reason ?? "unknown",
    contentType: typeof choice?.message.content,
    contentLength: typeof choice?.message.content === "string" ? choice.message.content.length : 0,
  });
}

function replaceCharacter(sequence: string, index: number, character: unknown) {
  const verified = character === "W" || character === "H" ? character : sequence[index];
  return `${sequence.slice(0, index)}${verified}${sequence.slice(index + 1)}`;
}

function findWhPositions(sheet: string, plate: string) {
  return Array.from({ length: 7 }, (_, index) => index).filter(
    (index) => /[WH]/.test(sheet[index] ?? "") || /[WH]/.test(plate[index] ?? ""),
  );
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  conference: router({
    analyze: publicProcedure.input(ANALYSIS_SCHEMA).mutation(async ({ input }) => {
      const startedAt = performance.now();

      if (
        input.verifyWh
        && input.sheetCropBase64
        && input.plateCropBase64
        && input.knownSheet
        && input.knownPlate
      ) {
        const whPositions = findWhPositions(input.knownSheet, input.knownPlate);
        const verificationResponse = await invokeLLM({
          model: "gpt-5-mini",
          reasoning: { effort: "minimal" },
          maxCompletionTokens: 160,
          maxRetries: 1,
          messages: [
            { role: "system", content: WH_VERIFICATION_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: `Verifique somente as posições ${whPositions.map((index) => index + 1).join(", ")}. A leitura inicial foi folha ${input.knownSheet} e placa ${input.knownPlate}. Retorne uma entrada para cada posição solicitada.` },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.sheetCropBase64}`, detail: "auto" } },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.plateCropBase64}`, detail: "auto" } },
              ],
            },
          ],
          response_format: WH_RESPONSE_FORMAT,
        });
        const verification = parseModelJson(verificationResponse.choices[0]?.message.content);
        if (!Object.keys(verification).length) logUnusableResponse("W/H verification", verificationResponse);
        const verificationPositions = Array.isArray(verification.positions)
          ? verification.positions.filter((position): position is Record<string, unknown> => Boolean(position) && typeof position === "object")
          : [];
        const positionAt = (index: number) => verificationPositions.find((position) => position.position === index + 1);
        const verifiedSheet = whPositions.reduce(
          (sequence, index) => replaceCharacter(sequence, index, positionAt(index)?.sheetCharacter),
          input.knownSheet,
        );
        const verifiedPlate = whPositions.reduce(
          (sequence, index) => replaceCharacter(sequence, index, positionAt(index)?.plateCharacter),
          input.knownPlate,
        );
        const everyPositionConfirmed = whPositions.every((index) => {
          const position = positionAt(index);
          return (position?.sheetCharacter === "W" || position?.sheetCharacter === "H")
            && (position?.plateCharacter === "W" || position?.plateCharacter === "H")
            && position?.ambiguous === false;
        });
        const result = buildConferenceResult({
          sheet: verifiedSheet,
          plate: verifiedPlate,
          sheetConfidence: 95,
          plateConfidence: 95,
          whAmbiguous: verification.ambiguous !== false || !everyPositionConfirmed,
          sheetVisible: true,
          plateVisible: true,
          distinctItems: true,
        });
        console.info(`[conference] W/H verification completed in ${Math.round(performance.now() - startedAt)}ms`);
        return result;
      }

      if (input.sheetCropBase64 && input.plateCropBase64) {
        const focusedResponse = await invokeLLM({
          model: "gemini-3-flash-preview",
          messages: [
            { role: "system", content: FOCUSED_EXTRACTION_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Leia a sequência da folha no primeiro recorte e a sequência da placa no segundo. Compare sem assumir que são iguais." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.sheetCropBase64}`, detail: "auto" } },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.plateCropBase64}`, detail: "auto" } },
              ],
            },
          ],
          response_format: FULL_RESPONSE_FORMAT,
        });
        const focused = parseModelJson(focusedResponse.choices[0]?.message.content);
        if (!Object.keys(focused).length) logUnusableResponse("focused", focusedResponse);
        const result = buildConferenceResult(focused);
        console.info(`[conference] focused analysis completed in ${Math.round(performance.now() - startedAt)}ms`);
        return result;
      }

      if (input.plateCropBase64 && input.knownSheet) {
        const fallbackResponse = await invokeLLM({
          model: "gemini-3-flash-preview",
          messages: [
            { role: "system", content: PLATE_FALLBACK_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: `A folha foi lida como ${input.knownSheet}. Leia a placa física neste recorte.` },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.plateCropBase64}`, detail: "auto" } },
              ],
            },
          ],
          response_format: PLATE_RESPONSE_FORMAT,
        });
        const fallback = parseModelJson(fallbackResponse.choices[0]?.message.content);
        if (!Object.keys(fallback).length) logUnusableResponse("plate fallback", fallbackResponse);
        const result = buildConferenceResult({
          sheet: input.knownSheet,
          plate: fallback.plate,
          sheetConfidence: 100,
          plateConfidence: fallback.plateConfidence,
          whAmbiguous: fallback.whAmbiguous,
          sheetVisible: true,
          plateVisible: fallback.plateVisible,
          distinctItems: fallback.plateVisible,
        });
        console.info(`[conference] fallback analysis completed in ${Math.round(performance.now() - startedAt)}ms`);
        return result;
      }

      const fullResponse = await invokeLLM({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: FULL_EXTRACTION_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia as duas sequências da imagem agora." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.imageBase64}`, detail: "auto" } },
            ],
          },
        ],
        response_format: FULL_RESPONSE_FORMAT,
      });
      const extracted = parseModelJson(fullResponse.choices[0]?.message.content);
      if (!Object.keys(extracted).length) logUnusableResponse("full", fullResponse);
      const result = buildConferenceResult(extracted);
      console.info(`[conference] full analysis completed in ${Math.round(performance.now() - startedAt)}ms`);
      return result;
    }),
  }),
});

export type AppRouter = typeof appRouter;
