import Link from "next/link";

import { DataStreamControllerDemo } from "@/components/ai-sdk-agents/data-stream-controller-demo";

export default function DataStreamControllerDocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-12">
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          <span aria-hidden> / </span>
          DataStreamController
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          DataStreamController
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Headless observer/controller that FIFO-buffers AI SDK{" "}
          <code className="font-mono text-xs">data-*</code> parts and delivers
          them to one sink. Behavior package:{" "}
          <code className="font-mono text-xs">@ai-sdk-agents/react</code>.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Anatomy</h2>
        <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong className="text-foreground">Root</strong> — owns one
            Root-lifetime FIFO store; append must not rerender the tree.
          </li>
          <li>
            <strong className="text-foreground">Handler</strong> — sole drain
            owner. Receives{" "}
            <code className="font-mono text-xs">{"onPart({ part })"}</code> and
            optional{" "}
            <code className="font-mono text-xs">
              {"onError({ cause, part })"}
            </code>
            . Claim-before-dispatch, FIFO order.
          </li>
          <li>
            <strong className="text-foreground">useAppend</strong> — stable{" "}
            <code className="font-mono text-xs">append</code> for{" "}
            <code className="font-mono text-xs">useChat(onData)</code>. Use{" "}
            <code className="font-mono text-xs">useController</code> for{" "}
            <code className="font-mono text-xs">append</code> /{" "}
            <code className="font-mono text-xs">appendMany</code> /{" "}
            <code className="font-mono text-xs">clear</code>.
          </li>
          <li>
            <strong className="text-foreground">useStatus</strong> —{" "}
            <code className="font-mono text-xs">pendingCount</code> /{" "}
            <code className="font-mono text-xs">hasPendingParts</code> only. No
            public drain, subscribe, or store.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Out of scope</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Common artifact deltas (
          <code className="font-mono text-xs">data-id</code>,{" "}
          <code className="font-mono text-xs">data-title</code>,{" "}
          <code className="font-mono text-xs">data-kind</code>,{" "}
          <code className="font-mono text-xs">data-clear</code>,{" "}
          <code className="font-mono text-xs">data-finish</code>) are treated
          like every other part. A future{" "}
          <code className="font-mono text-xs">ArtifactSession</code> adapter
          owns applying that protocol — not this controller.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Live demo</h2>
        <DataStreamControllerDemo />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Install</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            <strong className="text-foreground">npm</strong> (canonical
            behavior, after M6 publish approval):
          </p>
          <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs">
            pnpm add @ai-sdk-agents/react
          </pre>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Registry</strong> (composition
            example; depends on the npm package):
          </p>
          <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs">
            {`npx shadcn@latest add https://<your-deployed-host>/r/data-stream-controller-demo.json`}
          </pre>
        </div>
      </section>
    </main>
  );
}
