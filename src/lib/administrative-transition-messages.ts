import {
  getAdministrativeLevelLabel,
  getChangedAdministrativeLevels,
  type AdministrativeLevel,
} from "@/lib/geofence-monitor";

export interface AdministrativeTransitionMessage {
  phase: "exit" | "welcome";
  level: AdministrativeLevel;
  levelName: string;
  title: string;
  body: string;
  key: string;
}

export type AdministrativeNameIndex = ReadonlyMap<string, string>;

const LEVEL_PREFIX_PARTS: Record<AdministrativeLevel, number> = {
  province: 2,
  district: 3,
  sector: 4,
  cell: 5,
  village: 6,
};

function scopeAtLevel(
  villageScopeCode: string,
  level: AdministrativeLevel
): string | null {
  const parts = villageScopeCode.split("-");
  const count = LEVEL_PREFIX_PARTS[level];
  return parts.length >= count ? parts.slice(0, count).join("-") : null;
}

function nameAtLevel(
  villageScopeCode: string,
  level: AdministrativeLevel,
  names: AdministrativeNameIndex
): string | null {
  const code = scopeAtLevel(villageScopeCode, level);
  return code ? names.get(code) ?? null : null;
}

export function formatAdministrativePath(
  villageScopeCode: string,
  names: AdministrativeNameIndex
): string {
  const levels: AdministrativeLevel[] = [
    "province", "district", "sector", "cell", "village",
  ];
  return levels.flatMap((level) => {
    const name = nameAtLevel(villageScopeCode, level, names);
    return name ? [`${getAdministrativeLevelLabel(level)}: ${name}`] : [];
  }).join(" · ");
}

/**
 * Creates explicit exit and welcome notifications for every administrative
 * boundary that changed. With no previous scope, it creates the initial
 * arrival/welcome messages only.
 */
export function buildAdministrativeTransitionMessages(
  fromVillageScopeCode: string | null | undefined,
  toVillageScopeCode: string | null | undefined,
  names: AdministrativeNameIndex
): AdministrativeTransitionMessage[] {
  if (!toVillageScopeCode) return [];

  const levels: AdministrativeLevel[] = fromVillageScopeCode
    ? getChangedAdministrativeLevels(fromVillageScopeCode, toVillageScopeCode)
    : ["province", "district", "sector", "cell", "village"];

  if (levels.length === 0) return [];

  const oldPath = fromVillageScopeCode
    ? formatAdministrativePath(fromVillageScopeCode, names)
    : "";
  const newPath = formatAdministrativePath(toVillageScopeCode, names);

  const messages: AdministrativeTransitionMessage[] = [];
  for (const level of levels) {
    const label = getAdministrativeLevelLabel(level);
    const oldName = fromVillageScopeCode
      ? nameAtLevel(fromVillageScopeCode, level, names)
      : null;
    const newName = nameAtLevel(toVillageScopeCode, level, names);

    if (fromVillageScopeCode && oldName) {
      messages.push({
        phase: "exit",
        level,
        levelName: oldName,
        title: `WASEZETSE: ${label} ${oldName}`,
        body: `Wasohotse muri ${label.toLowerCase()} ya ${oldName}. Uvuye aho hantu werekeza kuri: ${newPath || "ahantu hashya"}.`,
        key: `exit:${level}:${scopeAtLevel(fromVillageScopeCode, level)}:${scopeAtLevel(toVillageScopeCode, level)}`,
      });
    }

    if (newName) {
      const body = fromVillageScopeCode
        ? `Murakaza neza muri ${label.toLowerCase()} ya ${newName}! Uvuye muri: ${oldPath || "agace wari urimo"}. Ubu ugeze muri: ${newPath || newName}.`
        : `Murakaza neza muri ${label.toLowerCase()} ya ${newName}! Ubu uri muri: ${newPath || newName}.`;
      messages.push({
        phase: "welcome",
        level,
        levelName: newName,
        title: `MURAKAZA NEZA: ${label} ${newName}`,
        body,
        key: `welcome:${level}:${scopeAtLevel(toVillageScopeCode, level)}`,
      });
    }
  }

  return messages;
}
