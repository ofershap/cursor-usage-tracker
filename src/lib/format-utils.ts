const MODEL_MAP: [RegExp, string][] = [
  [/^claude-4\.6-opus-high-thinking-fast$/, "opus-4.6 think-fast"],
  [/^claude-4\.6-opus-high-thinking$/, "opus-4.6 thinking"],
  [/^claude-4\.6-opus-high$/, "opus-4.6"],
  [/^claude-4\.6-opus-max-thinking$/, "opus-4.6-max thinking"],
  [/^claude-4\.6-opus-max$/, "opus-4.6-max"],
  [/^claude-4\.5-sonnet-thinking$/, "sonnet-4.5 thinking"],
  [/^claude-4\.5-sonnet$/, "sonnet-4.5"],
  [/^claude-4\.5-opus-high-thinking$/, "opus-4.5 thinking"],
  [/^claude-4\.5-opus-high$/, "opus-4.5"],
  [/^claude-4\.5-haiku$/, "haiku-4.5"],
  [/^claude-4-sonnet-thinking$/, "sonnet-4 thinking"],
  [/^claude-4-sonnet-1m$/, "sonnet-4 (1M)"],
  [/^gpt-5\.3-codex-xhigh$/, "gpt-5.3 codex-xhigh"],
  [/^gpt-5\.3-codex-high$/, "gpt-5.3 codex-high"],
  [/^gpt-5\.3-codex$/, "gpt-5.3 codex"],
  [/^gpt-5\.2-codex$/, "gpt-5.2 codex"],
  [/^gpt-5\.2$/, "gpt-5.2"],
  [/^composer-1\.5$/, "composer-1.5"],
  [/^composer-1$/, "composer-1"],
  [/^gemini-3-pro-preview$/, "gemini-3-pro"],
  [/^gemini-3-flash-preview$/, "gemini-3-flash"],
];

export function shortModel(model: string): string {
  if (!model) return "—";
  for (const [regex, short] of MODEL_MAP) {
    if (regex.test(model)) return short;
  }
  return model;
}
