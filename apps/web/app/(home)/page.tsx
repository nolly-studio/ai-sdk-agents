import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-medium tracking-tight">AI SDK Agents</h1>
        <p className="text-fd-muted-foreground text-sm leading-relaxed">
          Public headless React primitives and a shadcn registry for AI SDK
          agent UIs. Canonical package:{" "}
          <code className="font-mono text-xs">@aisdkagents/react</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
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
        <a
          href="https://www.npmjs.com/package/@aisdkagents/react"
          target="_blank"
          rel="noreferrer"
          className="border-fd-border hover:bg-fd-muted rounded-2xl border px-3 py-2 font-medium"
        >
          npm
        </a>
      </div>

      <section className="text-fd-muted-foreground space-y-2 text-sm leading-relaxed">
        <p>
          Install with npm for behavior, or use the shadcn registry for a
          composition example.
        </p>
        <pre className="bg-fd-muted overflow-x-auto rounded-md p-3 font-mono text-xs">
          pnpm add @aisdkagents/react
        </pre>
      </section>
    </main>
  );
}
