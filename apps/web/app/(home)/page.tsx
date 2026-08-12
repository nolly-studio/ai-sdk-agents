import Link from "next/link";

import { ArtifactSessionDemo } from "@/components/ai-sdk-agents/artifact-session-demo";
import { DataStreamControllerDemo } from "@/components/ai-sdk-agents/data-stream-controller-demo";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-medium tracking-tight">AI SDK Agents</h1>
        <p className="text-fd-muted-foreground text-sm leading-relaxed">
          Public headless React primitives and a shadcn registry for AI SDK
          agent UIs. Canonical package:{" "}
          <code className="font-mono text-xs">@aisdkagents/react</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/docs"
          className="bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/80 rounded-2xl px-3 py-2 font-medium"
        >
          Documentation
        </Link>
        <Link
          href="/docs/data-stream-controller"
          className="border-fd-border hover:bg-fd-muted rounded-2xl border px-3 py-2 font-medium"
        >
          DataStreamController
        </Link>
        <Link
          href="/docs/artifact-session"
          className="border-fd-border hover:bg-fd-muted rounded-2xl border px-3 py-2 font-medium"
        >
          ArtifactSession
        </Link>
        <a
          href="https://www.npmjs.com/package/@aisdkagents/react"
          target="_blank"
          rel="noreferrer"
          className="border-fd-border hover:bg-fd-muted rounded-2xl border px-3 py-2 font-medium"
        >
          npm
        </a>
      </div>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium tracking-tight">
            DataStreamController
          </h2>
          <p className="text-fd-muted-foreground text-sm">
            FIFO ingress with styled status / log chrome from the registry skin.
          </p>
        </div>
        <DataStreamControllerDemo />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium tracking-tight">
            ArtifactSession
          </h2>
          <p className="text-fd-muted-foreground text-sm">
            Document snapshot over the stream controller — panel skin via{" "}
            <code className="font-mono text-xs">createArtifactSessionSkin</code>
            .
          </p>
        </div>
        <ArtifactSessionDemo />
      </section>

      <section className="text-fd-muted-foreground space-y-2 text-sm leading-relaxed">
        <p>
          Install with npm for behavior, or use the shadcn registry for skins
          and composition examples.
        </p>
        <pre className="bg-fd-muted overflow-x-auto rounded-md p-3 font-mono text-xs">
          pnpm add @aisdkagents/react
        </pre>
      </section>
    </main>
  );
}
