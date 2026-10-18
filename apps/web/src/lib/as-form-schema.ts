import type z from 'zod';

export function asFormSchema<TOutput>(schema: z.ZodType<TOutput>): z.ZodType<TOutput, TOutput> {
  return schema as z.ZodType<TOutput, TOutput>;
}
