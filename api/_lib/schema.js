import z from 'zod';

/**
 * Schema for a single fish/deco object.
 * Uses passthrough so extra fields are preserved, not stripped.
 */
const fishSchema = z.object({}).passthrough();

/**
 * Schema for the top-level aquarium object.
 * Validates required fields and enforces a max fishes array length of 50.
 */
export const aquariumSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    fishes: z.array(fishSchema).max(50),
    cleanliness: z.number(),
    algaeLevel: z.number(),
    bounds: z.object({}).passthrough(),
    lastCleanedAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

/**
 * Schema for the PUT /api/aquarium request body.
 */
export const putAquariumBodySchema = z.object({
  aquarium: aquariumSchema,
});
