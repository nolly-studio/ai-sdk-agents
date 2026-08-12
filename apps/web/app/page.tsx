import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-medium tracking-tight">AI SDK Agents</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Public headless React primitives and shadcn registry for AI SDK agent
          UIs. Canonical package:{" "}
          <code className="font-mono text-xs">@ai-sdk-agents/react</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/docs/data-stream-controller"
          className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-2xl px-3 py-2 font-medium"
        >
          DataStreamController docs
        </Link>
        <a
          href="https://github.com/nolly-studio/ai-sdk-agents"
          target="_blank"
          rel="noreferrer"
          className="border-border hover:bg-muted rounded-2xl border px-3 py-2 font-medium"
        >
          GitHub
        </a>
      </div>

      <section className="text-muted-foreground space-y-2 text-sm leading-relaxed">
        <p>
          Paid Pattern / pro-block application source stays in the private
          catalog. This repo is primitives + docs + public registry examples
          only.
        </p>
        <p>
          <code className="font-mono text-xs">@ai-sdk-agents/react</code>{" "}
          remains <code className="font-mono text-xs">private: true</code> until
          an explicit M6 publish approval.
        </p>
      </section>
    </main>
  );
}
