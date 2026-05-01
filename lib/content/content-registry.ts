import {
  catalogData,
  catalogFilePaths,
  catalogLastModified,
  conceptContentData,
  conceptContentFilePaths,
  conceptContentLastModified,
} from "./generated/content-registry";
import type { ConceptContentFile } from "./schema";

type CatalogKey = keyof typeof catalogData;

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function getCatalogData<K extends CatalogKey>(key: K) {
  return cloneValue(catalogData[key]);
}

export function getCatalogFilePath<K extends CatalogKey>(key: K): string {
  return catalogFilePaths[key];
}

export function getCatalogLastModified<K extends CatalogKey>(key: K): Date {
  return new Date(catalogLastModified[key]);
}

export function listConceptContentFileKeys(): ConceptContentFile[] {
  return Object.keys(conceptContentData) as ConceptContentFile[];
}

export function getConceptContentData(contentFile: ConceptContentFile) {
  const key = contentFile as keyof typeof conceptContentData;
  const data = conceptContentData[key];

  if (!data) {
    throw new Error(`Unknown concept content file: ${contentFile}`);
  }

  return cloneValue(data);
}

export function getConceptContentFilePath(contentFile: ConceptContentFile): string {
  const key = contentFile as keyof typeof conceptContentFilePaths;
  const filePath = conceptContentFilePaths[key];

  if (!filePath) {
    throw new Error(`Unknown concept content file: ${contentFile}`);
  }

  return filePath;
}

export function getConceptContentLastModified(contentFile: ConceptContentFile): Date {
  const key = contentFile as keyof typeof conceptContentLastModified;
  const modifiedAt = conceptContentLastModified[key];

  if (!modifiedAt) {
    throw new Error(`Unknown concept content file: ${contentFile}`);
  }

  return new Date(modifiedAt);
}
