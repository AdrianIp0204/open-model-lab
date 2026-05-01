export type SeededRng = {
  next: () => number;
  int: (maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
};

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRng(seed: string): SeededRng {
  let state = hashSeed(seed) || 0x9e3779b9;

  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const normalized = (state >>> 0) / 0xffffffff;
    return normalized === 1 ? 0.999999999 : normalized;
  };

  return {
    next,
    int(maxExclusive) {
      if (maxExclusive <= 0) {
        return 0;
      }

      return Math.floor(next() * maxExclusive);
    },
    pick(items) {
      if (!items.length) {
        throw new Error("Cannot pick from an empty list.");
      }

      return items[this.int(items.length)]!;
    },
    shuffle(items) {
      const nextItems = [...items];

      for (let index = nextItems.length - 1; index > 0; index -= 1) {
        const targetIndex = this.int(index + 1);
        [nextItems[index], nextItems[targetIndex]] = [
          nextItems[targetIndex]!,
          nextItems[index]!,
        ];
      }

      return nextItems;
    },
  };
}
