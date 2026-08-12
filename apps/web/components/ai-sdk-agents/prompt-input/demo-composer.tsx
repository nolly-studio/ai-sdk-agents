"use client";

import { usePromptInputContext } from "@aisdkagents/react/prompt-input";
import { AtSign, BookOpen, ChevronRight, Paperclip } from "lucide-react";
import * as React from "react";

import {
  PromptInput,
  PromptInputAtPalette,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputEditor,
  PromptInputFileInput,
  PromptInputFileTrigger,
  PromptInputLeading,
  PromptInputLiveRegion,
  PromptInputMenu,
  PromptInputMenuContent,
  PromptInputMenuFlyout,
  PromptInputMenuFlyoutTrigger,
  PromptInputMenuIcon,
  PromptInputMenuLabel,
  PromptInputMenuLabelText,
  PromptInputMenuSeparator,
  PromptInputMenuTrigger,
  PromptInputModel,
  PromptInputPaletteItem,
  PromptInputPaletteSectionLabel,
  PromptInputSkill,
  PromptInputSlashPalette,
  PromptInputSource,
  PromptInputSubmit,
  PromptInputTrailing,
} from "@/registry/ui/prompt-input";

import { createDemoTokenElement } from "./create-demo-token-element";
import { DEFAULT_MODELS, DEFAULT_SKILLS, DEFAULT_SOURCES } from "./defaults";
import { ModelIcon, SkillGlyph, SourceGlyph } from "./glyphs";
import type { ConnectorAuthStatus } from "./use-connector-auth";
import { useConnectorAuth } from "./use-connector-auth";
import { usePromptStream } from "./use-prompt-stream";

function wait(ms: number, signal: AbortSignal): Promise<void> {
  // Demo delay — Promise executor is the portable API under tsconfig lib es2022
  // (Promise.withResolvers needs es2024+ typings).
  // oxlint-disable-next-line promise/avoid-new
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

function sourceAction(
  source: (typeof DEFAULT_SOURCES)[number]
): "connect" | "attach" | "insert" {
  if (source.connect) {
    return "connect";
  }
  if (source.attach) {
    return "attach";
  }
  return "insert";
}

function connectLabel(connected: boolean, status: ConnectorAuthStatus): string {
  if (connected) {
    return "Connected";
  }
  if (status === "connecting") {
    return "…";
  }
  return "Connect";
}

function SlashPaletteItems() {
  const { slashResults } = usePromptInputContext("SlashPaletteItems");
  if (slashResults.length === 0) {
    return (
      <div className="text-muted-foreground flex h-9 items-center px-2.5 text-[13px]">
        No matching skills
      </div>
    );
  }
  return slashResults.map((skill) => (
    <PromptInputPaletteItem key={skill.id} value={skill.id}>
      <span className="text-muted-foreground inline-flex size-4 shrink-0 items-center justify-center [&_svg]:block">
        <SkillGlyph id={skill.id} />
      </span>
      <span className="text-foreground min-w-0 shrink truncate text-[13px] leading-none font-medium">
        {skill.name}
      </span>
      {skill.desc ? (
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-right text-[12px] leading-none">
          {skill.desc}
        </span>
      ) : null}
    </PromptInputPaletteItem>
  ));
}

function AtPaletteItems() {
  const { atQuery, atResults } = usePromptInputContext("AtPaletteItems");
  if (atResults.length === 0) {
    return (
      <div className="text-muted-foreground flex h-9 items-center px-2.5 text-[13px]">
        {atQuery ? `No matches for “${atQuery}”` : "No sources"}
      </div>
    );
  }

  const add = atResults.filter((source) => source.section !== "plugins");
  const plugins = atResults.filter((source) => source.section === "plugins");
  const sections = [
    { id: "add" as const, label: "Add", items: add },
    { id: "plugins" as const, label: "Plugins", items: plugins },
  ].filter((section) => section.items.length > 0);

  return sections.map((section) => (
    <div data-slot="prompt-input-at-section" key={section.id}>
      <PromptInputPaletteSectionLabel>
        {section.label}
      </PromptInputPaletteSectionLabel>
      {section.items.map((source) => {
        const meta = DEFAULT_SOURCES.find((item) => item.id === source.id);
        return (
          <PromptInputPaletteItem key={source.id} value={source.id}>
            <span className="text-muted-foreground inline-flex size-4 shrink-0 items-center justify-center [&_svg]:block">
              <SourceGlyph
                attach={meta?.attach}
                brand={meta?.brand}
                id={source.id}
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] leading-none">
              <span className="text-foreground font-medium">{source.name}</span>
              {source.desc ? (
                <span className="text-muted-foreground"> {source.desc}</span>
              ) : null}
            </span>
          </PromptInputPaletteItem>
        );
      })}
    </div>
  ));
}

/**
 * Opinionated demo composition: skin + default catalogs + connect + stream.
 * Visual chrome aligned with `components/__inspiration__/in-progress/prompt-input.tsx`.
 */
export function PromptInputDemoComposer({
  className,
  onMessage,
}: {
  className?: string;
  onMessage?: (text: string) => void;
}) {
  const auth = useConnectorAuth();
  const stream = usePromptStream({
    send: async (message, signal) => {
      onMessage?.(message.text);
      await wait(1200, signal);
    },
  });

  const sources = React.useMemo(
    () =>
      DEFAULT_SOURCES.map((source) => ({
        ...source,
        connected: auth.isConnected(source.id),
        action: sourceAction(source),
      })),
    [auth]
  );

  return (
    <PromptInput
      className={className}
      createTokenElement={createDemoTokenElement}
      defaultModelId={DEFAULT_MODELS[0]?.id}
      models={DEFAULT_MODELS}
      onStop={stream.onStop}
      onSubmit={stream.onSubmit}
      skills={DEFAULT_SKILLS}
      sources={sources}
      status={stream.status}
      submitting={stream.submitting}
      variant="rounded"
    >
      <PromptInputFileInput />
      <PromptInputAttachments />
      <PromptInputLeading>
        <PromptInputMenu>
          <PromptInputMenuTrigger aria-label="Add attachment or switch model" />
          <PromptInputMenuContent>
            <div className="relative">
              <PromptInputMenuFlyoutTrigger name="sources">
                <PromptInputMenuIcon>
                  <AtSign size={14} />
                </PromptInputMenuIcon>
                <PromptInputMenuLabelText>Sources</PromptInputMenuLabelText>
                <span className="text-muted-foreground inline-flex flex-none">
                  <ChevronRight size={14} />
                </span>
              </PromptInputMenuFlyoutTrigger>
              <PromptInputMenuFlyout className="w-[240px]" name="sources">
                <PromptInputMenuLabel>Add</PromptInputMenuLabel>
                {sources
                  .filter((source) => source.section !== "plugins")
                  .map((source) => (
                    <PromptInputSource
                      attach={source.attach}
                      icon={
                        <SourceGlyph
                          attach={source.attach}
                          brand={source.brand}
                          id={source.id}
                        />
                      }
                      key={source.id}
                      section={source.section}
                      value={source.id}
                      variant="flyout"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-[12px] font-medium">
                          {source.name}
                        </span>
                        {source.desc ? (
                          <span className="text-muted-foreground block truncate text-[11px]">
                            {source.desc}
                          </span>
                        ) : null}
                      </span>
                    </PromptInputSource>
                  ))}
                <PromptInputMenuSeparator />
                <PromptInputMenuLabel>Plugins</PromptInputMenuLabel>
                {sources
                  .filter((source) => source.section === "plugins")
                  .map((source) => (
                    <PromptInputSource
                      connect={source.connect}
                      connected={auth.isConnected(source.id)}
                      icon={<SourceGlyph brand={source.brand} id={source.id} />}
                      key={source.id}
                      onClick={async (event) => {
                        if (source.connect && !auth.isConnected(source.id)) {
                          event.preventDefault();
                          try {
                            await auth.connectSource(source.id);
                          } catch {
                            /* connection UX surfaces via auth status */
                          }
                        }
                      }}
                      section={source.section}
                      value={source.id}
                      variant="flyout"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-[12px] font-medium">
                          {source.name}
                        </span>
                        {source.desc ? (
                          <span className="text-muted-foreground block truncate text-[11px]">
                            {source.desc}
                          </span>
                        ) : null}
                      </span>
                      {source.connect ? (
                        <span className="text-muted-foreground text-[11px]">
                          {connectLabel(
                            auth.isConnected(source.id),
                            auth.statusOf(source.id)
                          )}
                        </span>
                      ) : null}
                    </PromptInputSource>
                  ))}
              </PromptInputMenuFlyout>
            </div>
            <div className="relative">
              <PromptInputMenuFlyoutTrigger name="skills">
                <PromptInputMenuIcon>
                  <BookOpen size={14} />
                </PromptInputMenuIcon>
                <PromptInputMenuLabelText>Skills</PromptInputMenuLabelText>
                <span className="text-muted-foreground inline-flex flex-none">
                  <ChevronRight size={14} />
                </span>
              </PromptInputMenuFlyoutTrigger>
              <PromptInputMenuFlyout className="w-[168px]" name="skills">
                {DEFAULT_SKILLS.map((skill) => (
                  <PromptInputSkill
                    icon={<SkillGlyph id={skill.id} />}
                    key={skill.id}
                    value={skill.id}
                  >
                    {skill.name}
                  </PromptInputSkill>
                ))}
              </PromptInputMenuFlyout>
            </div>
            <PromptInputMenuSeparator />
            <PromptInputFileTrigger>
              <PromptInputMenuIcon>
                <Paperclip size={14} />
              </PromptInputMenuIcon>
              <PromptInputMenuLabelText>
                Add photos & files
              </PromptInputMenuLabelText>
            </PromptInputFileTrigger>
            <PromptInputMenuSeparator />
            <PromptInputMenuLabel>Model</PromptInputMenuLabel>
            {DEFAULT_MODELS.map((model) => (
              <PromptInputModel
                context={model.context}
                desc={model.desc}
                icon={<ModelIcon id={model.id} />}
                key={model.id}
                value={model.id}
              >
                {model.name}
              </PromptInputModel>
            ))}
          </PromptInputMenuContent>
        </PromptInputMenu>
      </PromptInputLeading>
      <PromptInputBody>
        <PromptInputEditor placeholder="Ask anything… Use / for skills, @ for sources" />
        <PromptInputSlashPalette>
          <SlashPaletteItems />
        </PromptInputSlashPalette>
        <PromptInputAtPalette>
          <AtPaletteItems />
        </PromptInputAtPalette>
      </PromptInputBody>
      <PromptInputTrailing>
        <PromptInputSubmit />
      </PromptInputTrailing>
      <PromptInputLiveRegion />
    </PromptInput>
  );
}
