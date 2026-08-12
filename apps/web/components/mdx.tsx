import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { ArtifactSessionDemo } from "@/components/ai-sdk-agents/artifact-session-demo";
import { DataStreamControllerDemo } from "@/components/ai-sdk-agents/data-stream-controller-demo";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ArtifactSessionDemo,
    DataStreamControllerDemo,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
