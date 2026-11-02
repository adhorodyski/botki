import { makeSourceControlDefinitionRegistry } from "@t3tools/source-control-core/shared/definition";

export const canonicalizeGitCafePullRequestUrl = (url: string) => url;

export const builtInSourceControlDefinitions = makeSourceControlDefinitionRegistry([]);
