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
  knownSheet: z.string().min(7).max(7).optional(),
});

const COMMON_RULES = `A sequência segue obrigatoriamente o padrão ABC1D23: letras nas posições 1, 2, 3 e 5; números nas posições 4, 6 e 7. Ignore outros textos, números, códigos e datas. Examine com atenção 1/I, 0/O, 8/B e 5/S e use o tipo esperado na posição. G e C são letras válidas e distintas; nunca trate G e C como iguais. Não invente caracteres.`;

const FULL_EXTRACTION_PROMPT = `Você é um leitor preciso de placas Mercosul brasileiras. Receberá uma única fotografia com uma folha impressa do sistema e uma placa Mercosul física. Leia as duas sequências de 7 caracteres, uma na folha e uma na placa.

${COMMON_RULES} Se não houver leitura suficiente de algum item, devolva string vazia e confiança baixa. Responda exclusivamente em JSON válido, sem markdown:
{"sheet":"ABC1D23 ou vazio","plate":"ABC1D23 ou vazio","sheetConfidence":0,"plateConfidence":0}`;

const PLATE_FALLBACK_PROMPT = `Você é um leitor preciso de placas Mercosul brasileiras. Receberá um recorte ampliado da metade inferior de uma foto, contendo a placa Mercosul física. Leia somente os 7 caracteres da placa física.

${COMMON_RULES} Se não houver leitura suficiente, devolva string vazia e confiança baixa. Responda exclusivamente em JSON válido, sem markdown:
{"plate":"ABC1D23 ou vazio","plateConfidence":0}`;

function parseModelJson(content: unknown): Record<string, unknown> {
  if (typeof content !== "string" || !content) return {};
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
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
          response_format: { type: "json_object" },
        });
        const fallback = parseModelJson(fallbackResponse.choices[0]?.message.content);
        return buildConferenceResult({
          sheet: input.knownSheet,
          plate: fallback.plate,
          sheetConfidence: 100,
          plateConfidence: fallback.plateConfidence,
        });
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
        response_format: { type: "json_object" },
      });
      return buildConferenceResult(parseModelJson(fullResponse.choices[0]?.message.content));
    }),
  }),
});

export type AppRouter = typeof appRouter;

