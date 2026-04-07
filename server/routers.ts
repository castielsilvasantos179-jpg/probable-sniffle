import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";
import {
  generateShortCode,
  isValidUrl,
  isValidAlias,
  sanitizeUrl,
  hashPassword,
  verifyPassword,
  generateApiKey,
  formatDateToYYYYMMDD,
  getGeoLocation,
  detectDeviceType,
  parseBrowser,
  isFacebookBot,
  isBot,
} from "./utils";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================================================
  // Links Management
  // ============================================================================
  links: router({
    create: protectedProcedure
      .input(
        z.object({
          originalUrl: z.string().url("URL inválida"),
          customAlias: z.string().optional(),
          password: z.string().optional(),
          expiresAt: z.date().optional(),
          ogTitle: z.string().optional(),
          ogDescription: z.string().optional(),
          ogImage: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // Validar URL
        const sanitized = sanitizeUrl(input.originalUrl);
        if (!sanitized) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "URL inválida",
          });
        }

        // Validar alias personalizado se fornecido
        if (input.customAlias) {
          if (!isValidAlias(input.customAlias)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Alias deve conter apenas letras, números, hífens e underscores (3-50 caracteres)",
            });
          }

          // Verificar se alias já existe
          const existing = await db.getLinkByCustomAlias(input.customAlias);
          if (existing) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Este alias já está em uso",
            });
          }
        }

        // Gerar short code único
        let shortCode = generateShortCode();
        let attempts = 0;
        while (attempts < 10) {
          const existing = await db.getLinkByShortCode(shortCode);
          if (!existing) break;
          shortCode = generateShortCode();
          attempts++;
        }

        if (attempts === 10) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao gerar short code",
          });
        }

        // Criar link
        await db.createLink(userId, {
          shortCode,
          customAlias: input.customAlias,
          originalUrl: sanitized,
          password: input.password ? hashPassword(input.password) : undefined,
          expiresAt: input.expiresAt,
          ogTitle: input.ogTitle,
          ogDescription: input.ogDescription,
          ogImage: input.ogImage,
        });

        const link = await db.getLinkByShortCode(shortCode);
        return link;
      }),

    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const links = await db.getUserLinks(ctx.user.id, input.limit, input.offset);
        return links;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.id, ctx.user.id);
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link não encontrado",
          });
        }
        return link;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          customAlias: z.string().optional(),
          password: z.string().optional(),
          expiresAt: z.date().optional(),
          ogTitle: z.string().optional(),
          ogDescription: z.string().optional(),
          ogImage: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.id, ctx.user.id);
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link não encontrado",
          });
        }

        const updateData: any = {};

        if (input.customAlias !== undefined) {
          if (input.customAlias === "") {
            updateData.customAlias = null;
          } else {
            if (!isValidAlias(input.customAlias)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Alias deve conter apenas letras, números, hífens e underscores (3-50 caracteres)",
              });
            }

            const existing = await db.getLinkByCustomAlias(input.customAlias);
            if (existing && existing.id !== input.id) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Este alias já está em uso",
              });
            }

            updateData.customAlias = input.customAlias;
          }
        }

        if (input.password !== undefined) {
          updateData.password = input.password ? hashPassword(input.password) : null;
        }

        if (input.expiresAt !== undefined) {
          updateData.expiresAt = input.expiresAt;
        }

        if (input.ogTitle !== undefined) {
          updateData.ogTitle = input.ogTitle || null;
        }

        if (input.ogDescription !== undefined) {
          updateData.ogDescription = input.ogDescription || null;
        }

        if (input.ogImage !== undefined) {
          updateData.ogImage = input.ogImage || null;
        }

        await db.updateLink(input.id, ctx.user.id, updateData);
        return await db.getLinkById(input.id, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.id, ctx.user.id);
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link não encontrado",
          });
        }

        await db.deleteLink(input.id, ctx.user.id);
        return { success: true };
      }),

    stats: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.id, ctx.user.id);
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link não encontrado",
          });
        }

        const stats = await db.getLinkClickStats(input.id, ctx.user.id);
        const byCountry = await db.getClicksByCountry(input.id, ctx.user.id);
        const byDevice = await db.getClicksByDevice(input.id, ctx.user.id);

        return {
          totalClicks: stats.totalClicks,
          uniqueIps: stats.uniqueIps,
          lastClick: stats.lastClick,
          byCountry,
          byDevice,
        };
      }),

    recentClicks: protectedProcedure
      .input(z.object({ id: z.number(), limit: z.number().max(100).default(20) }))
      .query(async ({ ctx, input }) => {
        const link = await db.getLinkById(input.id, ctx.user.id);
        if (!link) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Link não encontrado",
          });
        }

        return db.getLinkClicks(input.id, ctx.user.id, input.limit);
      }),
  }),

  // ============================================================================
  // API Keys Management
  // ============================================================================
  apiKeys: router({
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const key = generateApiKey();
        await db.createApiKey(ctx.user.id, input.name, key);
        return { key };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const keys = await db.getUserApiKeys(ctx.user.id);
      // Não retornar a chave completa, apenas os últimos 4 caracteres
      return keys.map((k) => ({
        ...k,
        key: `...${k.key.slice(-4)}`,
      }));
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteApiKey(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // Dashboard Stats
  // ============================================================================
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const links = await db.getUserLinks(ctx.user.id, 1000, 0);
      const totalLinks = links.length;

      let totalClicks = 0;
      let totalUniqueIps = 0;

      for (const link of links) {
        totalClicks += link.totalClicks || 0;
      }

      return {
        totalLinks,
        totalClicks,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
