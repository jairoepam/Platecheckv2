import { z } from "zod";

import { buildConferenceResult } from "../lib/conference-logic";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const ANALYSIS_SCHEMA = z.object({
  imageBase64: z.string().min(100).max(6_000_000),
  plateCropBase64: z.string().min(100).max(4_000_000),
});

const EXTRACTION_PROMPT = `Você é um leitor preciso de placas Mercosul brasileiras. Você receberá duas imagens da mesma conferência: a primeira é a fotografia completa, com uma folha impressa do sistema e uma placa Mercosul física; a segunda é um recorte ampliado da metade inferior dessa foto, destinado exclusivamente à leitura da placa física. Leia somente a sequência de 7 caracteres que identifica a placa em cada item.

Regras: a sequência segue obrigatoriamente o padrão ABC1D23, isto é, letras nas posições 1, 2, 3 e 5; números nas posições 4, 6 e 7. Ignore outros textos, números, códigos e datas. Examine com atenção os pares visuais 1/I, 0/O, 8/B e 5/S: use o tipo esperado na posição para decidir entre letra e número. G e C são letras válidas e distintas; não as trate como iguais, leia a forma com cuidado. Não invente caracteres; se algo não estiver claramente legível, devolva uma string vazia e confiança baixa. Responda exclusivamente em JSON válido, sem markdown, exatamente neste formato:
{"sheet":"ABC1D23 ou vazio","plate":"ABC1D23 ou vazio","sheetConfidence":0,"plateConfidence":0}`;

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
      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia as duas sequências da imagem agora." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${input.imageBase64}`,
                  detail: "auto",
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${input.plateCropBase64}`,
                  detail: "auto",
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message.content;
      if (typeof content !== "string" || !content) {
        return buildConferenceResult({});
      }

      try {
        return buildConferenceResult(JSON.parse(content));
      } catch {
        return buildConferenceResult({});
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
