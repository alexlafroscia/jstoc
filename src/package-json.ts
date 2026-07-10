import * as zod from "zod";

export type ExportValue = string | null | ExportValue[] | { [key: string]: ExportValue };

const ExportValue: zod.ZodType<ExportValue> = zod.lazy(() =>
  zod.union([
    zod.string(),
    zod.null(),
    zod.array(ExportValue),
    zod.record(zod.string(), ExportValue),
  ]),
);

export const PackageJSON = zod.object({
  name: zod.string(),
  exports: ExportValue.optional(),
});

export type PackageJSON = zod.infer<typeof PackageJSON>;
