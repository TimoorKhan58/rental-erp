import { z } from "zod";

import {
  DASHBOARD_THEMES,
  DASHBOARD_WIDGET_IDS,
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  MIN_WIDGET_COORDINATE,
  MIN_WIDGET_DIMENSION,
} from "@/modules/dashboard/domain/dashboard.constants";
import { NonEmptyStringSchema } from "@/shared/application/validation";

const DashboardWidgetLayoutSchema = z.object({
  widgetId: z.enum(DASHBOARD_WIDGET_IDS),
  row: z.coerce.number().int().min(MIN_WIDGET_COORDINATE),
  column: z.coerce.number().int().min(MIN_WIDGET_COORDINATE),
  width: z.coerce.number().int().min(MIN_WIDGET_DIMENSION).max(MAX_WIDGET_WIDTH),
  height: z.coerce
    .number()
    .int()
    .min(MIN_WIDGET_DIMENSION)
    .max(MAX_WIDGET_HEIGHT),
  visible: z.boolean(),
});

const DashboardLayoutContentSchema = z
  .object({
    version: z.coerce.number().int().min(1),
    theme: z.enum(DASHBOARD_THEMES),
    collapsedSections: z.array(NonEmptyStringSchema).default([]),
    widgets: z.array(DashboardWidgetLayoutSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const widgetIds = new Set<string>();

    for (const [index, widget] of value.widgets.entries()) {
      if (widgetIds.has(widget.widgetId)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate widget id: ${widget.widgetId}`,
          path: ["widgets", index, "widgetId"],
        });
      }

      widgetIds.add(widget.widgetId);
    }
  });

export const CreateDashboardLayoutSchema = z.object({
  layout: DashboardLayoutContentSchema,
});

export const UpdateDashboardLayoutSchema = z
  .object({
    layout: z
      .object({
        version: z.coerce.number().int().min(1).optional(),
        theme: z.enum(DASHBOARD_THEMES).optional(),
        collapsedSections: z.array(NonEmptyStringSchema).optional(),
        widgets: z.array(DashboardWidgetLayoutSchema).min(1).optional(),
      })
      .superRefine((value, ctx) => {
        if (value.widgets === undefined) {
          return;
        }

        const widgetIds = new Set<string>();

        for (const [index, widget] of value.widgets.entries()) {
          if (widgetIds.has(widget.widgetId)) {
            ctx.addIssue({
              code: "custom",
              message: `Duplicate widget id: ${widget.widgetId}`,
              path: ["widgets", index, "widgetId"],
            });
          }

          widgetIds.add(widget.widgetId);
        }
      }),
  })
  .superRefine((value, ctx) => {
    const layout = value.layout;
    const hasUpdates =
      layout.version !== undefined ||
      layout.theme !== undefined ||
      layout.collapsedSections !== undefined ||
      layout.widgets !== undefined;

    if (!hasUpdates) {
      ctx.addIssue({
        code: "custom",
        message: "At least one layout field must be provided",
        path: ["layout"],
      });
    }
  });

export type CreateDashboardLayoutInput = z.infer<
  typeof CreateDashboardLayoutSchema
>;
export type UpdateDashboardLayoutInput = z.infer<
  typeof UpdateDashboardLayoutSchema
>;
