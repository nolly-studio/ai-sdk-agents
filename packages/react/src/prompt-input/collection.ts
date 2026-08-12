import type {
  ModelRegistration,
  PromptInputModelDefinition,
  PromptInputSkillDefinition,
  PromptInputSourceDefinition,
  PromptInputSourceSection,
  SkillRegistration,
  SourceRegistration,
} from "./types";

type PromptInputCollection = {
  modelById: ReadonlyMap<string, PromptInputModelDefinition>;
  models: readonly PromptInputModelDefinition[];
  skillById: ReadonlyMap<string, PromptInputSkillDefinition>;
  skills: readonly PromptInputSkillDefinition[];
  sourceById: ReadonlyMap<string, PromptInputSourceDefinition>;
  sources: readonly PromptInputSourceDefinition[];
};

function createPromptInputCollection(options: {
  models?: readonly PromptInputModelDefinition[];
  skills?: readonly PromptInputSkillDefinition[];
  sources?: readonly PromptInputSourceDefinition[];
}): PromptInputCollection | null {
  const { models, skills, sources } = options;

  if (models === undefined && skills === undefined && sources === undefined) {
    return null;
  }

  const modelList = models ?? [];
  const skillList = skills ?? [];
  const sourceList = sources ?? [];

  return {
    modelById: new Map(modelList.map((model) => [model.id, model])),
    models: modelList,
    skillById: new Map(skillList.map((skill) => [skill.id, skill])),
    skills: skillList,
    sourceById: new Map(sourceList.map((source) => [source.id, source])),
    sources: sourceList,
  };
}

function getSourceSection(
  source: Pick<PromptInputSourceDefinition, "section">
): PromptInputSourceSection {
  return source.section ?? "add";
}

function getCollectionRegistrationWarnings(
  collection: PromptInputCollection,
  registrations: {
    models: readonly ModelRegistration[];
    skills: readonly SkillRegistration[];
    sources: readonly SourceRegistration[];
  }
) {
  const warnings: string[] = [];

  // Schema may drive palettes without mounted menu rows. Only warn when the
  // tree registers an id that the schema does not know about.
  for (const skill of registrations.skills) {
    if (collection.skills.length && !collection.skillById.has(skill.id)) {
      warnings.push(
        `[PromptInput] skill "${skill.id}" is registered but missing from Root.skills.`
      );
    }
  }

  for (const source of registrations.sources) {
    if (collection.sources.length && !collection.sourceById.has(source.id)) {
      warnings.push(
        `[PromptInput] source "${source.id}" is registered but missing from Root.sources.`
      );
    }
  }

  for (const model of registrations.models) {
    if (collection.models.length && !collection.modelById.has(model.id)) {
      warnings.push(
        `[PromptInput] model "${model.id}" is registered but missing from Root.models.`
      );
    }
  }

  return warnings;
}

export type { PromptInputCollection };
export {
  createPromptInputCollection,
  getCollectionRegistrationWarnings,
  getSourceSection,
};
