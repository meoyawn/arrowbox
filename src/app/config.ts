export const Config = {
  heavyScriptDelayMs: process.env.NODE_ENV === "test" ? 0 : 1500,
} as const
