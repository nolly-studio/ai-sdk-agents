/**
 * Demo catalogs for PromptInput skins / sandboxes.
 * App-owned — not part of the headless primitive.
 */

export type DemoModel = {
  context: string;
  desc: string;
  id: string;
  name: string;
};

export type DemoSkill = {
  desc: string;
  id: string;
  name: string;
};

export type DemoSource = {
  attach?: boolean;
  brand?: "figma" | "gmail" | "slack";
  connect?: boolean;
  desc?: string;
  id: string;
  name: string;
  section?: "add" | "plugins";
};

export const DEFAULT_MODELS: DemoModel[] = [
  {
    id: "claude-opus-4.8",
    name: "Claude Opus 4.8",
    desc: "Anthropic's most capable model — best for complex, multi-step reasoning.",
    context: "200k context window",
  },
  {
    id: "gpt-5.6",
    name: "GPT-5.6",
    desc: "OpenAI's flagship — strong all-round performance and tool use.",
    context: "400k context window",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    desc: "Google's long-context model — great for large documents and codebases.",
    context: "1M context window",
  },
];

export const DEFAULT_SKILLS: DemoSkill[] = [
  {
    id: "deep-research",
    name: "Deep Research",
    desc: "Multi-source research with citations",
  },
  {
    id: "code-review",
    name: "Code Review",
    desc: "Find bugs, risks, and cleanups",
  },
  {
    id: "web-search",
    name: "Web Search",
    desc: "Live results from the public web",
  },
  {
    id: "summarize",
    name: "Summarize",
    desc: "Condense long threads and docs",
  },
];

export const DEFAULT_SOURCES: DemoSource[] = [
  {
    id: "attach",
    name: "Files and folders",
    attach: true,
    section: "add",
  },
  {
    id: "analytics",
    name: "Revenue analytics",
    desc: "MRR, churn, and cohort trends",
    section: "add",
  },
  {
    id: "catalog",
    name: "Product catalog",
    desc: "SKUs, inventory, and pricing",
    section: "add",
  },
  {
    id: "web",
    name: "Web search",
    desc: "Live results from the public web",
    section: "add",
  },
  {
    id: "figma",
    name: "Figma",
    desc: "Pull frames, components, and specs",
    brand: "figma",
    section: "plugins",
  },
  {
    id: "slack",
    name: "Slack",
    desc: "Search channels and recent threads",
    brand: "slack",
    section: "plugins",
  },
  {
    id: "gmail",
    name: "Gmail",
    desc: "Find mail, threads, and attachments",
    brand: "gmail",
    connect: true,
    section: "plugins",
  },
];
