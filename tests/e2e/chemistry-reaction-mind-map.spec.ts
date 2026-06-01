import { expect, test, type Page } from "@playwright/test";
import { gotoAndExpectOk, installBrowserGuards } from "./helpers";

async function disableOnboardingPrompt(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "open-model-lab.onboarding.v1",
      JSON.stringify({
        promptDismissed: true,
        disabled: false,
        completed: false,
        lastStep: 0,
        updatedAt: new Date().toISOString(),
      }),
    );
  });
}

async function waitForStableChemistryGraph(page: Page) {
  await page.waitForFunction(() => {
    const viewport = document.querySelector('[data-testid="chemistry-graph-viewport"]');
    const minimapWindow = document.querySelector(
      '[data-testid="chem-minimap-visible-window"]',
    );

    if (!(viewport instanceof HTMLElement) || !(minimapWindow instanceof SVGElement)) {
      return false;
    }

    const sample = JSON.stringify({
      scale: viewport.getAttribute("data-chem-scale"),
      x: viewport.getAttribute("data-chem-offset-x"),
      y: viewport.getAttribute("data-chem-offset-y"),
      camera: viewport.getAttribute("data-chem-camera-mode"),
      width: Math.round(viewport.getBoundingClientRect().width),
      height: Math.round(viewport.getBoundingClientRect().height),
      minimapWidth: minimapWindow.getAttribute("data-chem-window-width"),
      minimapHeight: minimapWindow.getAttribute("data-chem-window-height"),
      labelRects: [
        "alkane-to-haloalkane-radical-substitution",
        "carboxylic-acid-to-carboxylate-salt-neutralisation",
        "ester-to-carboxylate-salt-alkaline-hydrolysis",
      ].map((edgeId) => {
        const label = document.querySelector(
          `[data-testid="chem-edge-map-label-${edgeId}"]`,
        );
        if (!(label instanceof HTMLElement)) {
          return `${edgeId}:missing`;
        }

        const rect = label.getBoundingClientRect();
        return `${edgeId}:${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(
          rect.right,
        )},${Math.round(rect.bottom)}`;
      }),
    });

    const win = window as Window & {
      __chemGraphStableSample?: string;
      __chemGraphStableSince?: number;
    };
    const now = performance.now();

    if (win.__chemGraphStableSample !== sample) {
      win.__chemGraphStableSample = sample;
      win.__chemGraphStableSince = now;
      return false;
    }

    return now - (win.__chemGraphStableSince ?? now) >= 300;
  });
}

async function waitForStableChemistryCamera(page: Page) {
  await page.waitForFunction(() => {
    const viewport = document.querySelector('[data-testid="chemistry-graph-viewport"]');

    if (!(viewport instanceof HTMLElement)) {
      return false;
    }

    const sample = JSON.stringify({
      scale: viewport.getAttribute("data-chem-scale"),
      x: viewport.getAttribute("data-chem-offset-x"),
      y: viewport.getAttribute("data-chem-offset-y"),
      camera: viewport.getAttribute("data-chem-camera-mode"),
      hover: viewport.getAttribute("data-chem-hover-target"),
    });
    const win = window as Window & {
      __chemCameraStableSample?: string;
      __chemCameraStableSince?: number;
    };
    const now = performance.now();

    if (win.__chemCameraStableSample !== sample) {
      win.__chemCameraStableSample = sample;
      win.__chemCameraStableSince = now;
      return false;
    }

    return now - (win.__chemCameraStableSince ?? now) >= 300;
  });
}

const CHEMISTRY_RIGHT_SIDE_NODE_IDS = [
  "aldehyde",
  "ketone",
  "hydroxynitrile",
  "carboxylic-acid",
  "ester",
  "acyl-chloride",
  "amide",
  "carboxylate-salt",
] as const;

const CHEMISTRY_RIGHT_SIDE_EDGE_IDS = [
  "aldehyde-to-carboxylic-acid-oxidation",
  "aldehyde-to-hydroxynitrile-cyanohydrin-addition",
  "ketone-to-hydroxynitrile-cyanohydrin-addition",
  "nitrile-to-carboxylic-acid-hydrolysis",
  "carboxylic-acid-to-ester-esterification",
  "ester-to-carboxylic-acid-hydrolysis",
  "carboxylic-acid-to-carboxylate-salt-neutralisation",
  "carboxylic-acid-to-acyl-chloride-chlorination",
  "acyl-chloride-to-ester-alcoholysis",
  "acyl-chloride-to-amide-ammonolysis",
  "ester-to-carboxylate-salt-alkaline-hydrolysis",
] as const;

const CHEMISTRY_LEFT_SIDE_NODE_IDS = [
  "alkane",
  "alkene",
  "haloalkane",
  "alcohol",
  "nitrile",
  "amine",
] as const;

const CHEMISTRY_LEFT_SIDE_EDGE_IDS = [
  "alkane-to-haloalkane-radical-substitution",
  "alkane-to-alkene-cracking",
  "alkene-to-alkane-hydrogenation",
  "alkene-to-alcohol-hydration",
  "alkene-to-haloalkane-hydrohalogenation",
  "haloalkane-to-alcohol-hydrolysis",
  "haloalkane-to-nitrile-cyanide-substitution",
  "haloalkane-to-amine-ammonia-substitution",
  "alcohol-to-haloalkane-substitution",
] as const;

const CHEMISTRY_LEFT_SIDE_EXPECTED_LABELS = {
  "alkene-to-haloalkane-hydrohalogenation": "Add HX",
  "haloalkane-to-nitrile-cyanide-substitution": "Add CN",
  "haloalkane-to-amine-ammonia-substitution": "Add NH3",
  "alcohol-to-haloalkane-substitution": "Substitution",
} as const;

async function expectChemistryGraphItemsInsideViewport(
  page: Page,
  testIds: readonly string[],
) {
  const outsideItems = await page.evaluate((ids) => {
    const viewport = document.querySelector(
      '[data-testid="chemistry-graph-viewport"]',
    );

    if (!(viewport instanceof HTMLElement)) {
      return ["chemistry-graph-viewport:missing"];
    }

    const viewportRect = viewport.getBoundingClientRect();
    const tolerance = 4;

    return ids.flatMap((id) => {
      const element = document.querySelector(`[data-testid="${id}"]`);
      if (!(element instanceof Element)) {
        return [`${id}:missing`];
      }

      const rect = element.getBoundingClientRect();
      const clipped =
        rect.left < viewportRect.left - tolerance ||
        rect.right > viewportRect.right + tolerance ||
        rect.top < viewportRect.top - tolerance ||
        rect.bottom > viewportRect.bottom + tolerance;

      return clipped
        ? [
            `${id}:${Math.round(rect.left - viewportRect.left)},${Math.round(
              rect.top - viewportRect.top,
            )},${Math.round(rect.right - viewportRect.right)},${Math.round(
              rect.bottom - viewportRect.bottom,
            )}`,
          ]
        : [];
    });
  }, testIds);

  expect(outsideItems).toEqual([]);
}

async function expectChemistryEdgeLabelsReadable(
  page: Page,
  edgeIds: readonly string[],
) {
  const issues = await page.evaluate((ids) => {
    const viewport = document.querySelector(
      '[data-testid="chemistry-graph-viewport"]',
    );

    if (!(viewport instanceof HTMLElement)) {
      return ["chemistry-graph-viewport:missing"];
    }

    const viewportRect = viewport.getBoundingClientRect();
    const tolerance = 4;

    return ids.flatMap((edgeId) => {
      const edgeLabel = document.querySelector(
        `[data-testid="chem-edge-${edgeId}"]`,
      );
      const mapLabel = document.querySelector(
        `[data-testid="chem-edge-map-label-${edgeId}"]`,
      );

      if (!(edgeLabel instanceof HTMLElement)) {
        return [`${edgeId}:edge-label-missing`];
      }

      if (!(mapLabel instanceof HTMLElement)) {
        return [`${edgeId}:map-label-missing`];
      }

      const labelRect = mapLabel.getBoundingClientRect();
      const outOfViewport =
        labelRect.left < viewportRect.left - tolerance ||
        labelRect.right > viewportRect.right + tolerance ||
        labelRect.top < viewportRect.top - tolerance ||
        labelRect.bottom > viewportRect.bottom + tolerance;
      const textClipped =
        mapLabel.scrollWidth > mapLabel.clientWidth + 2 ||
        mapLabel.scrollHeight > mapLabel.clientHeight + 2;

      return [
        outOfViewport
          ? `${edgeId}:outside:${Math.round(labelRect.left - viewportRect.left)},${Math.round(
              labelRect.top - viewportRect.top,
            )},${Math.round(labelRect.right - viewportRect.right)},${Math.round(
              labelRect.bottom - viewportRect.bottom,
            )}`
          : null,
        textClipped
          ? `${edgeId}:clipped:${mapLabel.scrollWidth}x${mapLabel.scrollHeight}/${mapLabel.clientWidth}x${mapLabel.clientHeight}`
          : null,
      ].filter((issue): issue is string => Boolean(issue));
    });
  }, edgeIds);

  expect(issues).toEqual([]);
}

async function expectNoChemistryEdgeLabelNodeTitleOverlap(page: Page) {
  const overlapIssues = await page.evaluate(() => {
    const getRect = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    };
    const getOverlapArea = (
      first: ReturnType<typeof getRect>,
      second: ReturnType<typeof getRect>,
    ) => {
      const width = Math.max(
        0,
        Math.min(first.right, second.right) - Math.max(first.left, second.left),
      );
      const height = Math.max(
        0,
        Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
      );

      return Math.round(width * height);
    };
    const edgeLabels = Array.from(
      document.querySelectorAll('[data-chem-label-role="pathway-secondary"]'),
    ).filter((item): item is HTMLElement => item instanceof HTMLElement);
    const nodeTitles = Array.from(
      document.querySelectorAll('[data-chem-label-role="family-primary"]'),
    ).filter((item): item is HTMLElement => item instanceof HTMLElement);

    return edgeLabels.flatMap((edgeLabel) => {
      const edgeStyle = getComputedStyle(edgeLabel);
      if (edgeStyle.display === "none" || Number(edgeStyle.opacity) < 0.05) {
        return [];
      }

      const edgeRect = getRect(edgeLabel);
      return nodeTitles.flatMap((nodeTitle) => {
        const titleRect = getRect(nodeTitle);
        const overlapArea = getOverlapArea(edgeRect, titleRect);
        return overlapArea > 12
          ? [
              `${edgeLabel.getAttribute("data-testid") ?? "edge"}/${
                nodeTitle.textContent?.trim() ?? "node"
              }:${overlapArea}`,
            ]
          : [];
      });
    });
  });

  expect(overlapIssues).toEqual([]);
}

async function expectChemistryLeftSideClusterReadable(page: Page) {
  const issues = await page.evaluate(
    ({ nodeIds, edgeIds, expectedLabels }) => {
      const viewport = document.querySelector(
        '[data-testid="chemistry-graph-viewport"]',
      );

      if (!(viewport instanceof HTMLElement)) {
        return ["chemistry-graph-viewport:missing"];
      }

      const viewportRect = viewport.getBoundingClientRect();
      const getRect = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      };
      const getOverlapArea = (
        first: ReturnType<typeof getRect>,
        second: ReturnType<typeof getRect>,
      ) => {
        const width = Math.max(
          0,
          Math.min(first.right, second.right) - Math.max(first.left, second.left),
        );
        const height = Math.max(
          0,
          Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
        );

        return Math.round(width * height);
      };
      const nodeRects = nodeIds.map((id) => {
        const node = document.querySelector(`[data-testid="chem-node-${id}"]`);
        const title = node?.querySelector(
          '[data-chem-label-role="family-primary"]',
        );

        return node instanceof HTMLElement && title instanceof HTMLElement
          ? { id, rect: getRect(node), titleRect: getRect(title) }
          : null;
      });
      const labelRects = edgeIds.map((id) => {
        const label = document.querySelector(
          `[data-testid="chem-edge-map-label-${id}"]`,
        );
        const shell = document.querySelector(`[data-testid="chem-edge-${id}"]`);

        if (!(label instanceof HTMLElement) || !(shell instanceof HTMLElement)) {
          return null;
        }

        const style = getComputedStyle(shell);
        if (style.display === "none" || Number(style.opacity) < 0.05) {
          return null;
        }

        return {
          id,
          rect: getRect(label),
          text: label.textContent?.replace(/\s+/g, " ").trim() ?? "",
          fullLabel: shell.getAttribute("data-chem-full-label"),
          owner: label.getAttribute("data-chem-label-owner"),
          attachment: label.getAttribute("data-chem-label-attachment"),
          scrollWidth: label.scrollWidth,
          scrollHeight: label.scrollHeight,
          clientWidth: label.clientWidth,
          clientHeight: label.clientHeight,
        };
      });
      const missingNodes = nodeRects.flatMap((node, index) =>
        node ? [] : [`${nodeIds[index]}:node-missing`],
      );
      const missingLabels = labelRects.flatMap((label, index) =>
        label ? [] : [`${edgeIds[index]}:label-missing`],
      );
      const presentNodes = nodeRects.filter(
        (node): node is NonNullable<typeof node> => node !== null,
      );
      const presentLabels = labelRects.filter(
        (label): label is NonNullable<typeof label> => label !== null,
      );
      const nodeOverlaps: string[] = [];
      for (let index = 0; index < presentNodes.length; index += 1) {
        for (
          let nextIndex = index + 1;
          nextIndex < presentNodes.length;
          nextIndex += 1
        ) {
          const overlapArea = getOverlapArea(
            presentNodes[index].rect,
            presentNodes[nextIndex].rect,
          );
          if (overlapArea > 1) {
            nodeOverlaps.push(
              `${presentNodes[index].id}/${presentNodes[nextIndex].id}:${overlapArea}`,
            );
          }
        }
      }
      const labelNodeOverlaps = presentLabels.flatMap((label) =>
        presentNodes.flatMap((node) => {
          const overlapArea = getOverlapArea(label.rect, node.titleRect);
          return overlapArea > 12
            ? [`${label.id}/${node.id}:${overlapArea}`]
            : [];
        }),
      );
      const labelLabelOverlaps: string[] = [];
      for (let index = 0; index < presentLabels.length; index += 1) {
        for (
          let nextIndex = index + 1;
          nextIndex < presentLabels.length;
          nextIndex += 1
        ) {
          const overlapArea = getOverlapArea(
            presentLabels[index].rect,
            presentLabels[nextIndex].rect,
          );
          if (overlapArea > 12) {
            labelLabelOverlaps.push(
              `${presentLabels[index].id}/${presentLabels[nextIndex].id}:${overlapArea}`,
            );
          }
        }
      }
      const labelIssues = presentLabels.flatMap((label) => {
        const outOfViewport =
          label.rect.left < viewportRect.left - 4 ||
          label.rect.right > viewportRect.right + 4 ||
          label.rect.top < viewportRect.top - 4 ||
          label.rect.bottom > viewportRect.bottom + 4;
        const clipped =
          label.scrollWidth > label.clientWidth + 2 ||
          label.scrollHeight > label.clientHeight + 2;
        const expectedLabel = (expectedLabels as Record<string, string>)[
          label.id
        ];

        return [
          label.owner === label.id ? null : `${label.id}:owner:${label.owner}`,
          label.attachment === "leader-line"
            ? null
            : `${label.id}:attachment:${label.attachment}`,
          outOfViewport ? `${label.id}:outside-viewport` : null,
          clipped ? `${label.id}:text-clipped` : null,
          label.text === "Hydrohalo." ? `${label.id}:confusing-label` : null,
          expectedLabel && label.text !== expectedLabel
            ? `${label.id}:label:${label.text}`
            : null,
          label.id === "alkene-to-haloalkane-hydrohalogenation" &&
          label.fullLabel !== "Hydrohalogenation"
            ? `${label.id}:full-label:${label.fullLabel}`
            : null,
        ].filter((issue): issue is string => Boolean(issue));
      });

      return [
        ...missingNodes,
        ...missingLabels,
        ...nodeOverlaps,
        ...labelNodeOverlaps,
        ...labelLabelOverlaps,
        ...labelIssues,
      ];
    },
    {
      nodeIds: CHEMISTRY_LEFT_SIDE_NODE_IDS,
      edgeIds: CHEMISTRY_LEFT_SIDE_EDGE_IDS,
      expectedLabels: CHEMISTRY_LEFT_SIDE_EXPECTED_LABELS,
    },
  );

  expect(issues).toEqual([]);
}

async function expectChemistryRightSideClusterReadable(page: Page) {
  const issues = await page.evaluate(
    ({ nodeIds, edgeIds }) => {
      const viewport = document.querySelector(
        '[data-testid="chemistry-graph-viewport"]',
      );

      if (!(viewport instanceof HTMLElement)) {
        return ["chemistry-graph-viewport:missing"];
      }

      const viewportRect = viewport.getBoundingClientRect();
      const getRect = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      };
      const getOverlapArea = (
        first: ReturnType<typeof getRect>,
        second: ReturnType<typeof getRect>,
      ) => {
        const width = Math.max(
          0,
          Math.min(first.right, second.right) - Math.max(first.left, second.left),
        );
        const height = Math.max(
          0,
          Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
        );

        return Math.round(width * height);
      };
      const nodeRects = nodeIds.map((id) => {
        const node = document.querySelector(`[data-testid="chem-node-${id}"]`);
        const title = node?.querySelector(
          '[data-chem-label-role="family-primary"]',
        );

        return node instanceof HTMLElement && title instanceof HTMLElement
          ? { id, rect: getRect(node), titleRect: getRect(title) }
          : null;
      });
      const labelRects = edgeIds.map((id) => {
        const label = document.querySelector(
          `[data-testid="chem-edge-map-label-${id}"]`,
        );

        if (!(label instanceof HTMLElement)) {
          return null;
        }

        const shell = document.querySelector(`[data-testid="chem-edge-${id}"]`);
        if (!(shell instanceof HTMLElement)) {
          return null;
        }

        const style = getComputedStyle(shell);
        if (style.display === "none" || Number(style.opacity) < 0.05) {
          return null;
        }

        return {
          id,
          rect: getRect(label),
          owner: label.getAttribute("data-chem-label-owner"),
          attachment: label.getAttribute("data-chem-label-attachment"),
          scrollWidth: label.scrollWidth,
          scrollHeight: label.scrollHeight,
          clientWidth: label.clientWidth,
          clientHeight: label.clientHeight,
        };
      });
      const missingNodes = nodeRects.flatMap((node, index) =>
        node ? [] : [`${nodeIds[index]}:node-missing`],
      );
      const missingLabels = labelRects.flatMap((label, index) =>
        label ? [] : [`${edgeIds[index]}:label-missing`],
      );
      const presentNodes = nodeRects.filter(
        (node): node is NonNullable<typeof node> => node !== null,
      );
      const presentLabels = labelRects.filter(
        (label): label is NonNullable<typeof label> => label !== null,
      );
      const nodeOverlaps: string[] = [];
      for (let index = 0; index < presentNodes.length; index += 1) {
        for (
          let nextIndex = index + 1;
          nextIndex < presentNodes.length;
          nextIndex += 1
        ) {
          const overlapArea = getOverlapArea(
            presentNodes[index].rect,
            presentNodes[nextIndex].rect,
          );
          if (overlapArea > 1) {
            nodeOverlaps.push(
              `${presentNodes[index].id}/${presentNodes[nextIndex].id}:${overlapArea}`,
            );
          }
        }
      }
      const labelNodeOverlaps = presentLabels.flatMap((label) =>
        presentNodes.flatMap((node) => {
          const overlapArea = getOverlapArea(label.rect, node.titleRect);
          return overlapArea > 12
            ? [`${label.id}/${node.id}:${overlapArea}`]
            : [];
        }),
      );
      const labelLabelOverlaps: string[] = [];
      for (let index = 0; index < presentLabels.length; index += 1) {
        for (
          let nextIndex = index + 1;
          nextIndex < presentLabels.length;
          nextIndex += 1
        ) {
          const overlapArea = getOverlapArea(
            presentLabels[index].rect,
            presentLabels[nextIndex].rect,
          );
          if (overlapArea > 12) {
            labelLabelOverlaps.push(
              `${presentLabels[index].id}/${presentLabels[nextIndex].id}:${overlapArea}`,
            );
          }
        }
      }
      const labelIssues = presentLabels.flatMap((label) => {
        const outOfViewport =
          label.rect.left < viewportRect.left - 4 ||
          label.rect.right > viewportRect.right + 4 ||
          label.rect.top < viewportRect.top - 4 ||
          label.rect.bottom > viewportRect.bottom + 4;
        const clipped =
          label.scrollWidth > label.clientWidth + 2 ||
          label.scrollHeight > label.clientHeight + 2;

        return [
          label.owner === label.id ? null : `${label.id}:owner:${label.owner}`,
          label.attachment === "leader-line"
            ? null
            : `${label.id}:attachment:${label.attachment}`,
          outOfViewport ? `${label.id}:outside-viewport` : null,
          clipped ? `${label.id}:text-clipped` : null,
        ].filter((issue): issue is string => Boolean(issue));
      });

      return [
        ...missingNodes,
        ...missingLabels,
        ...nodeOverlaps,
        ...labelNodeOverlaps,
        ...labelLabelOverlaps,
        ...labelIssues,
      ];
    },
    {
      nodeIds: CHEMISTRY_RIGHT_SIDE_NODE_IDS,
      edgeIds: CHEMISTRY_RIGHT_SIDE_EDGE_IDS,
    },
  );

  expect(issues).toEqual([]);
}

async function expectChemistryActiveRouteLabelsOwned(
  page: Page,
  edgeIds: readonly string[],
) {
  const issues = await page.evaluate((ids) => {
    const viewport = document.querySelector(
      '[data-testid="chemistry-graph-viewport"]',
    );
    const minimap = document.querySelector('[data-testid="chem-graph-minimap"]');

    if (!(viewport instanceof HTMLElement)) {
      return ["chemistry-graph-viewport:missing"];
    }

    const viewportRect = viewport.getBoundingClientRect();
    const minimapRect =
      minimap instanceof HTMLElement ? minimap.getBoundingClientRect() : null;
    const getRect = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    };
    const getOverlapArea = (
      first: ReturnType<typeof getRect>,
      second: ReturnType<typeof getRect>,
    ) => {
      const width = Math.max(
        0,
        Math.min(first.right, second.right) - Math.max(first.left, second.left),
      );
      const height = Math.max(
        0,
        Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
      );

      return Math.round(width * height);
    };
    const nodeTitles = Array.from(
      document.querySelectorAll('[data-chem-label-role="family-primary"]'),
    ).filter((item): item is HTMLElement => item instanceof HTMLElement);

    return ids.flatMap((id) => {
      const shell = document.querySelector(`[data-testid="chem-edge-${id}"]`);
      const label = document.querySelector(
        `[data-testid="chem-edge-map-label-${id}"]`,
      );
      const leader = document.querySelector(
        `[data-testid="chem-edge-label-leader-${id}"]`,
      );

      if (!(shell instanceof HTMLElement) || !(label instanceof HTMLElement)) {
        return [`${id}:label-missing`];
      }

      const labelRect = getRect(label);
      const activeNodeOverlaps = nodeTitles.flatMap((nodeTitle) => {
        const overlapArea = getOverlapArea(labelRect, getRect(nodeTitle));
        return overlapArea > 16
          ? [
              `${id}/${
                nodeTitle.textContent?.trim() ?? "node"
              }:${overlapArea}`,
            ]
          : [];
      });
      const outOfViewport =
        labelRect.left < viewportRect.left - 4 ||
        labelRect.right > viewportRect.right + 4 ||
        labelRect.top < viewportRect.top - 4 ||
        labelRect.bottom > viewportRect.bottom + 4;
      const underMinimap =
        minimapRect !== null && getOverlapArea(labelRect, minimapRect) > 8;

      return [
        shell.getAttribute("data-chem-label-owner") === id
          ? null
          : `${id}:shell-owner:${shell.getAttribute("data-chem-label-owner")}`,
        label.getAttribute("data-chem-label-owner") === id
          ? null
          : `${id}:label-owner:${label.getAttribute("data-chem-label-owner")}`,
        label.getAttribute("data-chem-label-attachment") === "leader-line"
          ? null
          : `${id}:label-attachment:${label.getAttribute(
              "data-chem-label-attachment",
            )}`,
        leader instanceof SVGElement
          ? null
          : `${id}:leader-missing`,
        leader instanceof SVGElement &&
        leader.getAttribute("data-chem-label-owner") === id
          ? null
          : `${id}:leader-owner`,
        outOfViewport ? `${id}:outside-viewport` : null,
        underMinimap ? `${id}:under-minimap` : null,
        ...activeNodeOverlaps,
      ].filter((issue): issue is string => Boolean(issue));
    });
  }, edgeIds);

  expect(issues).toEqual([]);
}

test("chemistry reaction mind map is map-first on initial desktop load", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await disableOnboardingPrompt(page);
  const guard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, "/tools/chemistry-reaction-mind-map");
  await waitForStableChemistryGraph(page);

  const firstScreen = await page.evaluate(() => {
    const heading = document.querySelector("h1");
    const worksurface = document.querySelector('[data-testid="chemistry-worksurface"]');
    const viewport = document.querySelector('[data-testid="chemistry-graph-viewport"]');
    const toolbar = document.querySelector('[data-testid="chemistry-graph-toolbar"]');
    const toolbarStatus = document.querySelector('[data-testid="chemistry-graph-toolbar-status"]');
    const previewStatus = document.querySelector('[data-testid="chem-preview-status"]');
    const alcoholLabel = document.querySelector(
      '[data-testid="chem-node-alcohol"] [data-chem-label-role="family-primary"]',
    );
    const hydrationEdge = document.querySelector(
      '[data-testid="chem-edge-alkene-to-alcohol-hydration"]',
    );
    const nodeIds = [
      "alkane",
      "alkene",
      "haloalkane",
      "nitrile",
      "amine",
      "alcohol",
      "aldehyde",
      "ketone",
      "hydroxynitrile",
      "carboxylic-acid",
      "carboxylate-salt",
      "acyl-chloride",
      "ester",
      "amide",
    ];
    const nodeElements = nodeIds
      .map((id) => document.querySelector(`[data-testid="chem-node-${id}"]`))
      .filter((item): item is HTMLElement => item instanceof HTMLElement);
    const edgeLabelElements = Array.from(
      document.querySelectorAll('[data-chem-label-role="pathway-secondary"]'),
    ).filter((item): item is HTMLElement => item instanceof HTMLElement);

    if (
      !(heading instanceof HTMLElement) ||
      !(worksurface instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement) ||
      !(toolbar instanceof HTMLElement) ||
      !(toolbarStatus instanceof HTMLElement) ||
      !(previewStatus instanceof HTMLElement) ||
      !(alcoholLabel instanceof HTMLElement) ||
      !(hydrationEdge instanceof HTMLElement) ||
      nodeElements.length !== nodeIds.length ||
      edgeLabelElements.length === 0
    ) {
      return null;
    }

    const getRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const getOverlapArea = (
      first: ReturnType<typeof getRect>,
      second: ReturnType<typeof getRect>,
    ) => {
      const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
      const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));

      return Math.round(width * height);
    };
    const nodeRects = nodeElements.map((element) => ({
      id: element.dataset.testid ?? "",
      rect: getRect(element),
      labelRect: getRect(
        element.querySelector('[data-chem-label-role="family-primary"]') as HTMLElement,
      ),
    }));
    const nodeOverlaps: string[] = [];
    for (let index = 0; index < nodeRects.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < nodeRects.length; nextIndex += 1) {
        const overlapArea = getOverlapArea(nodeRects[index].rect, nodeRects[nextIndex].rect);
        if (overlapArea > 1) {
          nodeOverlaps.push(`${nodeRects[index].id}/${nodeRects[nextIndex].id}:${overlapArea}`);
        }
      }
    }
    const edgeNodeLabelOverlaps = edgeLabelElements.flatMap((edgeLabel) => {
      const edgeRect = getRect(edgeLabel);
      return nodeRects.flatMap(({ id, labelRect }) => {
        const overlapArea = getOverlapArea(edgeRect, labelRect);
        return overlapArea > 12
          ? [`${edgeLabel.dataset.testid ?? "edge"}/${id}:${overlapArea}`]
          : [];
      });
    });

    const headingRect = heading.getBoundingClientRect();
    const worksurfaceRect = worksurface.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const nodeFontSize = Number.parseFloat(getComputedStyle(alcoholLabel).fontSize);
    const edgeFontSize = Number.parseFloat(getComputedStyle(hydrationEdge).fontSize);
    const edgeBackground = getComputedStyle(hydrationEdge).backgroundColor;
    const edgeBorderRadius = Number.parseFloat(getComputedStyle(hydrationEdge).borderTopLeftRadius);
    const previewStyle = getComputedStyle(previewStatus);
    const alcoholNode = document.querySelector('[data-testid="chem-node-alcohol"]');
    const alcoholNodeStyle =
      alcoholNode instanceof HTMLElement ? getComputedStyle(alcoholNode) : null;
    const nodeBorderWidth =
      alcoholNode instanceof HTMLElement
        ? Number.parseFloat(getComputedStyle(alcoholNode).borderTopWidth)
        : 0;
    const nodeBorderRadius =
      alcoholNodeStyle !== null
        ? Number.parseFloat(alcoholNodeStyle.borderTopLeftRadius)
        : 0;
    const edgeBorderWidth = Number.parseFloat(getComputedStyle(hydrationEdge).borderTopWidth);
    const edgeOverflowGuards = edgeLabelElements.flatMap((edgeLabel) =>
      Array.from(
        edgeLabel.querySelectorAll('[data-chem-overflow-guard="pathway-map-label"]'),
      ).filter((item): item is HTMLElement => item instanceof HTMLElement),
    );
    const nodeOverflowGuards = nodeElements.flatMap((nodeElement) =>
      [
        nodeElement,
        ...Array.from(
          nodeElement.querySelectorAll(
            '[data-chem-overflow-guard="node-title"], [data-chem-overflow-guard="node-formula"]',
          ),
        ),
      ].filter((item): item is HTMLElement => item instanceof HTMLElement),
    );
    const overflowingEdgeLabels = edgeOverflowGuards
      .filter(
        (element) =>
          getComputedStyle(element).overflowX !== "hidden" ||
          element.scrollWidth > element.clientWidth + 2 ||
          element.scrollHeight > element.clientHeight + 2,
      )
      .map((element) => element.getAttribute("data-testid") ?? element.textContent ?? "");
    const overflowingNodeText = nodeOverflowGuards
      .filter(
        (element) =>
          element.scrollWidth > element.clientWidth + 2 ||
          element.scrollHeight > element.clientHeight + 2,
      )
      .map((element) => element.getAttribute("data-testid") ?? element.textContent ?? "");

    return {
      density: worksurface.getAttribute("data-chemistry-density"),
      headingHeight: Math.round(headingRect.height),
      worksurfaceTop: Math.round(worksurfaceRect.top),
      viewportTop: Math.round(viewportRect.top),
      viewportBottom: Math.round(viewportRect.bottom),
      viewportHeight: Math.round(viewportRect.height),
      toolbarHeight: Math.round(toolbarRect.height),
      nodeFontSize,
      edgeFontSize,
      nodeWidth:
        alcoholNode instanceof HTMLElement
          ? Number(alcoholNode.getAttribute("data-chem-node-width"))
          : 0,
      nodeHeight:
        alcoholNode instanceof HTMLElement
          ? Number(alcoholNode.getAttribute("data-chem-node-height"))
          : 0,
      nodeBorderWidth,
      nodeBorderRadius,
      edgeBorderWidth,
      edgeBorderRadius,
      nodeVisualKind:
        alcoholNode instanceof HTMLElement
          ? alcoholNode.getAttribute("data-chem-visual-kind")
          : null,
      nodeVisualWeight:
        alcoholNode instanceof HTMLElement
          ? alcoholNode.getAttribute("data-chem-visual-weight")
          : null,
      edgeVisualKind: hydrationEdge.getAttribute("data-chem-visual-kind"),
      edgeVisualWeight: hydrationEdge.getAttribute("data-chem-visual-weight"),
      edgeLabelVisual: hydrationEdge.getAttribute("data-chem-label-visual"),
      edgeLabelShape: hydrationEdge.getAttribute("data-chem-label-shape"),
      edgeLabelRadius: hydrationEdge.getAttribute("data-chem-label-radius"),
      edgeLabelSize: hydrationEdge.getAttribute("data-chem-label-size"),
      edgeMapLabel: hydrationEdge.getAttribute("data-chem-map-label"),
      edgeBackground,
      nodeLabelWeight: alcoholLabel.getAttribute("data-chem-label-weight"),
      edgeLabelWeight: hydrationEdge.getAttribute("data-chem-label-weight"),
      overflowingEdgeLabels,
      toolbarHeightMode: toolbar.getAttribute("data-chem-toolbar-height"),
      toolbarOverflowMode: toolbarStatus.getAttribute("data-chem-toolbar-overflow"),
      toolbarOverflowX: getComputedStyle(toolbarStatus).overflowX,
      previewLayout: previewStatus.getAttribute("data-chem-preview-layout"),
      previewOverflowX: previewStyle.overflowX,
      previewTextOverflow: previewStyle.textOverflow,
      previewWhiteSpace: previewStyle.whiteSpace,
      navigationMode: viewport.getAttribute("data-chem-navigation-mode"),
      wheelMode: viewport.getAttribute("data-chem-wheel-mode"),
      nodeOverlaps,
      edgeNodeLabelOverlaps,
      overflowX: getComputedStyle(viewport).overflowX,
      overflowY: getComputedStyle(viewport).overflowY,
      overflowingNodeText,
    };
  });

  if (!firstScreen) {
    throw new Error("Chemistry first-screen layout metrics were not available.");
  }

  expect(firstScreen.density).toBe("map-first");
  expect(firstScreen.headingHeight).toBeLessThanOrEqual(120);
  expect(firstScreen.worksurfaceTop).toBeLessThan(340);
  expect(firstScreen.viewportTop).toBeLessThan(650);
  expect(firstScreen.viewportBottom).toBeGreaterThan(620);
  expect(firstScreen.viewportHeight).toBeGreaterThanOrEqual(320);
  expect(firstScreen.toolbarHeight).toBeLessThanOrEqual(42);
  expect(firstScreen.nodeFontSize).toBeGreaterThan(firstScreen.edgeFontSize);
  expect(firstScreen.nodeWidth).toBeGreaterThanOrEqual(228);
  expect(firstScreen.nodeHeight).toBeGreaterThanOrEqual(124);
  expect(firstScreen.nodeBorderWidth).toBeGreaterThan(firstScreen.edgeBorderWidth);
  expect(firstScreen.nodeBorderRadius).toBeGreaterThan(firstScreen.edgeBorderRadius);
  expect(firstScreen.edgeBorderRadius).toBeLessThanOrEqual(6);
  expect(firstScreen.nodeVisualKind).toBe("compound-family");
  expect(firstScreen.nodeVisualWeight).toBe("primary");
  expect(firstScreen.edgeVisualKind).toBe("reaction-pathway");
  expect(firstScreen.edgeVisualWeight).toBe("secondary");
  expect(firstScreen.edgeLabelVisual).toBe("inline-annotation");
  expect(firstScreen.edgeLabelShape).toBe("compact-annotation");
  expect(firstScreen.edgeLabelRadius).toBe("low");
  expect(firstScreen.edgeLabelSize).toBe("small");
  expect(firstScreen.edgeMapLabel).toBe("Hydration");
  expect(firstScreen.edgeBackground).toBe("rgba(0, 0, 0, 0)");
  expect(firstScreen.nodeLabelWeight).toBe("primary");
  expect(firstScreen.edgeLabelWeight).toBe("secondary");
  expect(firstScreen.toolbarHeightMode).toBe("stable");
  expect(firstScreen.toolbarOverflowMode).toBe("stable-single-line");
  expect(firstScreen.toolbarOverflowX).toBe("hidden");
  expect(firstScreen.previewLayout).toBe("single-line");
  expect(firstScreen.previewOverflowX).toBe("hidden");
  expect(firstScreen.previewTextOverflow).toBe("ellipsis");
  expect(firstScreen.previewWhiteSpace).toBe("nowrap");
  expect(firstScreen.navigationMode).toBe("drag-pan");
  expect(firstScreen.wheelMode).toBe("page-scroll");
  expect(firstScreen.overflowX).toBe("hidden");
  expect(firstScreen.overflowY).toBe("hidden");
  expect(firstScreen.nodeOverlaps).toEqual([]);
  expect(firstScreen.edgeNodeLabelOverlaps).toEqual([]);
  expect(firstScreen.overflowingEdgeLabels).toEqual([]);
  expect(firstScreen.overflowingNodeText).toEqual([]);
  await expectChemistryEdgeLabelsReadable(page, [
    "alkane-to-haloalkane-radical-substitution",
    "alkene-to-alkane-hydrogenation",
    "alkene-to-haloalkane-hydrohalogenation",
    "alkene-to-alcohol-hydration",
  ]);
  await expect(page.getByText("Hydrohalo.")).toHaveCount(0);
  await expect(
    page.getByTestId("chem-edge-alkene-to-haloalkane-hydrohalogenation"),
  ).toHaveAttribute("data-chem-map-label", "Add HX");
  await expect(
    page.getByTestId("chem-edge-alkene-to-haloalkane-hydrohalogenation"),
  ).toHaveAttribute("data-chem-full-label", "Hydrohalogenation");
  await expect(
    page.getByTestId("chem-edge-haloalkane-to-nitrile-cyanide-substitution"),
  ).toHaveAttribute("data-chem-map-label", "Add CN");
  await expect(
    page.getByTestId("chem-edge-haloalkane-to-amine-ammonia-substitution"),
  ).toHaveAttribute("data-chem-map-label", "Add NH3");
  await expectChemistryLeftSideClusterReadable(page);

  guard.assertNoActionableIssues();
});

test("chemistry reaction mind map avoids mobile horizontal overflow and keeps controls usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await disableOnboardingPrompt(page);
  const guard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, "/tools/chemistry-reaction-mind-map");
  await waitForStableChemistryGraph(page);

  const mobileLayout = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    const getElementMetrics = (selector: string) => {
      const element = document.querySelector(selector);

      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    };
    const getVisibleChildMetrics = (selector: string) => {
      const parent = document.querySelector(selector);

      if (!(parent instanceof HTMLElement)) {
        return [];
      }

      return Array.from(parent.children)
        .filter((child): child is HTMLElement => child instanceof HTMLElement)
        .map((child) => {
          const rect = child.getBoundingClientRect();
          const style = getComputedStyle(child);

          return {
            testId: child.getAttribute("data-testid"),
            text: child.textContent?.trim() ?? "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            scrollWidth: child.scrollWidth,
            scrollHeight: child.scrollHeight,
            clientWidth: child.clientWidth,
            clientHeight: child.clientHeight,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            textOverflow: style.textOverflow,
            whiteSpace: style.whiteSpace,
            position: style.position,
          };
        })
        .filter((child) => child.position !== "absolute" && child.width > 1 && child.height > 1);
    };

    return {
      horizontalOverflow: scrollWidth - viewportWidth,
      graphTitle: getElementMetrics('[data-onboarding-target="chemistry-graph"] h2'),
      graphChipRow: getElementMetrics('[data-testid="chemistry-selection-summary"]'),
      toolbar: getElementMetrics('[data-testid="chemistry-graph-toolbar"]'),
      toolbarStatus: getElementMetrics('[data-testid="chemistry-graph-toolbar-status"]'),
      toolbarStatusMode: document
        .querySelector('[data-testid="chemistry-graph-toolbar-status"]')
        ?.getAttribute("data-chem-toolbar-mobile-overflow"),
      toolbarStatusChips: getVisibleChildMetrics(
        '[data-testid="chemistry-graph-toolbar-status"]',
      ),
      zoomSliderControl: getElementMetrics('[data-testid="chem-zoom-slider-control"]'),
      zoomSlider: getElementMetrics('[data-testid="chem-zoom-slider"]'),
      zoomOut: getElementMetrics('[data-testid="chem-zoom-out"]'),
      zoomIn: getElementMetrics('[data-testid="chem-zoom-in"]'),
      fitView: getElementMetrics('[data-testid="chem-fit-view"]'),
      routeStart: getElementMetrics('[data-testid="chem-route-start"]'),
      routeTarget: getElementMetrics('[data-testid="chem-route-target"]'),
      routeSearch: getElementMetrics('[data-testid="chem-route-search"]'),
    };
  });

  expect(mobileLayout.horizontalOverflow).toBeLessThanOrEqual(1);
  for (const key of ["graphTitle", "graphChipRow", "toolbar"] as const) {
    const metrics = mobileLayout[key];

    expect(metrics, `${key} metrics`).not.toBeNull();
    expect(metrics?.left).toBeGreaterThanOrEqual(0);
    expect(metrics?.right).toBeLessThanOrEqual(390);
  }

  expect(mobileLayout.graphTitle?.scrollWidth).toBeLessThanOrEqual(
    (mobileLayout.graphTitle?.clientWidth ?? 0) + 1,
  );
  expect(mobileLayout.graphChipRow?.scrollWidth).toBeLessThanOrEqual(
    (mobileLayout.graphChipRow?.clientWidth ?? 0) + 1,
  );
  expect(mobileLayout.toolbarStatusMode).toBe("wrapped");
  expect(mobileLayout.toolbarStatus?.overflowX).toBe("visible");
  expect(mobileLayout.toolbarStatus?.right).toBeLessThanOrEqual(390);
  expect(mobileLayout.toolbarStatus?.scrollWidth).toBeLessThanOrEqual(
    (mobileLayout.toolbarStatus?.clientWidth ?? 0) + 1,
  );
  expect(mobileLayout.toolbarStatusChips.map((chip) => chip.testId)).toEqual(
    expect.arrayContaining(["chem-zoom-status", "chem-camera-status"]),
  );
  for (const chip of mobileLayout.toolbarStatusChips) {
    expect(chip.left, `${chip.text} left edge`).toBeGreaterThanOrEqual(0);
    expect(chip.right, `${chip.text} right edge`).toBeLessThanOrEqual(390);
    expect(chip.scrollWidth, `${chip.text} horizontal text fit`).toBeLessThanOrEqual(
      chip.clientWidth + 1,
    );
    expect(chip.scrollHeight, `${chip.text} vertical text fit`).toBeLessThanOrEqual(
      chip.clientHeight + 2,
    );
    expect(chip.textOverflow, `${chip.text} text overflow`).not.toBe("ellipsis");
  }
  expect(mobileLayout.zoomSliderControl?.height).toBeGreaterThanOrEqual(44);
  expect(mobileLayout.zoomSlider?.height).toBeGreaterThanOrEqual(24);
  expect(mobileLayout.zoomOut?.height).toBeGreaterThanOrEqual(44);
  expect(mobileLayout.zoomIn?.height).toBeGreaterThanOrEqual(44);
  expect(mobileLayout.fitView?.height).toBeGreaterThanOrEqual(44);
  expect(mobileLayout.routeStart?.height).toBeGreaterThanOrEqual(44);
  expect(mobileLayout.routeTarget?.height).toBeGreaterThanOrEqual(44);
  expect(mobileLayout.routeSearch?.height).toBeGreaterThanOrEqual(44);

  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chemistry-route-panel")).toBeVisible();
  const scaleBeforeZoom = await page.getByTestId("chemistry-graph-viewport").getAttribute(
    "data-chem-scale",
  );
  await page.getByTestId("chem-zoom-in").click();
  await expect
    .poll(() => page.getByTestId("chemistry-graph-viewport").getAttribute("data-chem-scale"))
    .not.toBe(scaleBeforeZoom);

  guard.assertNoActionableIssues();
});

test("chemistry reaction mind map puts the map inside the mobile first viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await disableOnboardingPrompt(page);
  const guard = await installBrowserGuards(page);

  for (const route of [
    "/tools/chemistry-reaction-mind-map",
    "/zh-HK/tools/chemistry-reaction-mind-map",
  ]) {
    await gotoAndExpectOk(page, route);
    await waitForStableChemistryGraph(page);

    const mobileFirstViewport = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const scrollWidth = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      );
      const getElementMetrics = (selector: string) => {
        const element = document.querySelector(selector);

        if (!(element instanceof HTMLElement)) {
          return null;
        }

        const rect = element.getBoundingClientRect();

        return {
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight,
        };
      };
      const visibleMapNodeCount = Array.from(
        document.querySelectorAll('[data-testid^="chem-node-"]'),
      ).filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const rect = element.getBoundingClientRect();

        return (
          rect.right > 0 &&
          rect.left < window.innerWidth &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight
        );
      }).length;

      return {
        horizontalOverflow: scrollWidth - viewportWidth,
        heroTitle: getElementMetrics("h1"),
        graphTitle: getElementMetrics('[data-onboarding-target="chemistry-graph"] h2'),
        selectionSummary: getElementMetrics('[data-testid="chemistry-selection-summary"]'),
        mapHint: getElementMetrics('[data-testid="chem-mobile-map-first-hint"]'),
        graphViewport: getElementMetrics('[data-testid="chemistry-graph-viewport"]'),
        toolbar: getElementMetrics('[data-testid="chemistry-graph-toolbar"]'),
        routeControls: getElementMetrics('[data-testid="chemistry-route-controls"]'),
        visibleMapNodeCount,
      };
    });

    expect(mobileFirstViewport.horizontalOverflow, `${route} horizontal overflow`).toBeLessThanOrEqual(
      1,
    );
    expect(mobileFirstViewport.graphViewport, `${route} graph viewport`).not.toBeNull();
    expect(mobileFirstViewport.graphViewport?.top, `${route} graph viewport top`).toBeLessThan(
      844,
    );
    expect(mobileFirstViewport.graphViewport?.height, `${route} graph viewport height`).toBeGreaterThanOrEqual(
      320,
    );
    expect(mobileFirstViewport.visibleMapNodeCount, `${route} visible map content`).toBeGreaterThan(
      0,
    );
    expect(mobileFirstViewport.mapHint, `${route} mobile hint`).not.toBeNull();
    expect(mobileFirstViewport.mapHint?.bottom, `${route} mobile hint before map`).toBeLessThanOrEqual(
      mobileFirstViewport.graphViewport?.top ?? 0,
    );
    expect(mobileFirstViewport.toolbar?.top, `${route} toolbar after map`).toBeGreaterThan(
      mobileFirstViewport.graphViewport?.top ?? 0,
    );
    expect(mobileFirstViewport.routeControls?.top, `${route} route controls after map`).toBeGreaterThan(
      mobileFirstViewport.graphViewport?.top ?? 0,
    );

    for (const [label, metrics] of [
      ["hero title", mobileFirstViewport.heroTitle],
      ["graph title", mobileFirstViewport.graphTitle],
      ["selection summary", mobileFirstViewport.selectionSummary],
      ["mobile hint", mobileFirstViewport.mapHint],
    ] as const) {
      expect(metrics, `${route} ${label}`).not.toBeNull();
      expect(metrics?.scrollWidth, `${route} ${label} horizontal fit`).toBeLessThanOrEqual(
        (metrics?.clientWidth ?? 0) + 1,
      );
      expect(metrics?.scrollHeight, `${route} ${label} vertical fit`).toBeLessThanOrEqual(
        (metrics?.clientHeight ?? 0) + 2,
      );
    }
  }

  guard.assertNoActionableIssues();
});

test("chemistry reaction mind map keeps the graph viewport clipped inside the split panel on widescreen layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1900, height: 930 });
  await disableOnboardingPrompt(page);
  const guard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, "/tools/chemistry-reaction-mind-map");
  await page.getByTestId("chemistry-worksurface").scrollIntoViewIfNeeded();
  await waitForStableChemistryGraph(page);
  await waitForStableChemistryCamera(page);

  const bounds = await page.evaluate(() => {
    const worksurface = document.querySelector('[data-testid="chemistry-worksurface"]');
    const viewport = document.querySelector('[data-testid="chemistry-graph-viewport"]');
    const footer = document.querySelector("footer");

    if (
      !(worksurface instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement) ||
      !(footer instanceof HTMLElement)
    ) {
      return null;
    }

    const worksurfaceRect = worksurface.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();

    return {
      worksurfaceBottom: worksurfaceRect.bottom,
      viewportBottom: viewportRect.bottom,
      viewportHeight: viewportRect.height,
      footerTop: footerRect.top,
    };
  });

  if (!bounds) {
    throw new Error("Chemistry worksurface bounds were not available.");
  }

  expect(bounds.viewportHeight).toBeGreaterThanOrEqual(400);
  expect(bounds.viewportBottom).toBeLessThanOrEqual(bounds.worksurfaceBottom + 1);
  expect(bounds.footerTop).toBeGreaterThan(bounds.worksurfaceBottom - 1);
  await expectChemistryRightSideClusterReadable(page);

  guard.assertNoActionableIssues();
});

test("chemistry reaction mind map supports focused camera, route exploration, and localized details", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1180, height: 1000 });
  await disableOnboardingPrompt(page);
  const guard = await installBrowserGuards(page);

  await gotoAndExpectOk(page, "/tools/chemistry-reaction-mind-map");
  await page.getByTestId("chemistry-worksurface").scrollIntoViewIfNeeded();
  await waitForStableChemistryGraph(page);

  const viewport = page.getByTestId("chemistry-graph-viewport");
  const inspector = page.getByTestId("chemistry-inspector-scroll");
  await expect(viewport).toBeVisible();
  const minimap = page.getByTestId("chem-graph-minimap");
  await expect(minimap).toBeVisible();
  await expect(page.getByTestId("chem-graph-flow-structure")).toBeAttached();
  await expect(page.getByTestId("chem-graph-flow-band-entry")).toHaveAttribute(
    "data-chem-flow-tone",
    "source",
  );
  await expect(page.getByTestId("chem-graph-flow-spine")).toHaveAttribute(
    "data-chem-flow-spine",
    "reactant-to-product",
  );
  await expect(page.getByTestId("chem-graph-flow-spine-checkpoint-3")).toBeAttached();
  await expect(page.getByTestId("chem-minimap-flow-band-product")).toHaveAttribute(
    "data-chem-flow-tone",
    "sink",
  );
  await expect(page.getByTestId("chem-minimap-flow-spine")).toBeAttached();
  await expect(minimap).toHaveAttribute("data-chem-minimap-camera-mode", "graph");
  const minimapVisibleWindow = page.getByTestId("chem-minimap-visible-window");
  await expect(minimapVisibleWindow).toHaveAttribute("data-chem-minimap-window", "viewport");
  const initialMinimapWindow = {
    width: Number(await minimapVisibleWindow.getAttribute("data-chem-window-width")),
    height: Number(await minimapVisibleWindow.getAttribute("data-chem-window-height")),
  };
  expect(initialMinimapWindow.width).toBeGreaterThan(0);
  expect(initialMinimapWindow.height).toBeGreaterThan(0);
  await expect(page.getByTestId("chem-zoom-in")).toBeVisible();
  await expect(page.getByTestId("chem-zoom-out")).toBeVisible();
  await expect(page.getByTestId("chem-fit-view")).toBeVisible();
  const zoomSlider = page.getByTestId("chem-zoom-slider");
  await expect(zoomSlider).toBeVisible();
  await expect(zoomSlider).toHaveAttribute("min", "32");
  await expect(zoomSlider).toHaveAttribute("max", "225");

  const fitScale = await viewport.getAttribute("data-chem-scale");
  await expect(zoomSlider).toHaveValue(String(Math.round(Number(fitScale) * 100)));
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "full-graph");
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "compact",
  );
  await expect(
    page.getByTestId("chem-edge-endpoints-alkene-to-alcohol-hydration"),
  ).toHaveClass(/hidden/);

  await page.getByTestId("chem-edge-alkene-to-alcohol-hydration").focus();
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "detailed",
  );
  await expect(page.getByTestId("chem-edge-endpoints-alkene-to-alcohol-hydration")).toHaveClass(
    /block/,
  );
  await page.getByTestId("chem-fit-view").focus();

  await page.getByTestId("chem-zoom-in").click();
  await expect(viewport).not.toHaveAttribute("data-chem-scale", fitScale ?? "");
  const zoomedScale = await viewport.getAttribute("data-chem-scale");
  await expect(zoomSlider).toHaveValue(String(Math.round(Number(zoomedScale) * 100)));
  await zoomSlider.fill("120");
  await expect(viewport).toHaveAttribute("data-chem-scale", "1.200");
  await expect(page.getByTestId("chem-zoom-status")).toContainText("120%");
  const zoomedMinimapWindow = {
    width: Number(await minimapVisibleWindow.getAttribute("data-chem-window-width")),
    height: Number(await minimapVisibleWindow.getAttribute("data-chem-window-height")),
  };
  expect(
    zoomedMinimapWindow.width < initialMinimapWindow.width ||
      zoomedMinimapWindow.height < initialMinimapWindow.height,
  ).toBe(true);
  await expect(page.getByTestId("chem-pan-affordance")).toHaveAttribute(
    "data-chem-pan-edges",
    /left.*right.*top.*bottom/,
  );
  await expect(page.getByTestId("chem-pan-affordance-right")).toHaveClass(
    /opacity-100/,
  );
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "detailed",
  );

  const dragOffsetX = await viewport.getAttribute("data-chem-offset-x");
  const dragBox = await viewport.boundingBox();
  if (!dragBox) {
    throw new Error("Chemistry graph viewport did not return a bounding box.");
  }
  await page.mouse.move(dragBox.x + 24, dragBox.y + 24);
  await page.mouse.down();
  await page.mouse.move(dragBox.x + 124, dragBox.y + 84);
  await page.mouse.up();
  await expect
    .poll(() => viewport.getAttribute("data-chem-offset-x"))
    .not.toBe(dragOffsetX);

  const initialOffsetX = await viewport.getAttribute("data-chem-offset-x");
  await viewport.focus();
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(() => viewport.getAttribute("data-chem-offset-x"))
    .not.toBe(initialOffsetX);

  await page.getByTestId("chem-fit-view").click();
  await expect(viewport).toHaveAttribute("data-chem-scale", fitScale ?? "");
  await expect(minimapVisibleWindow).toHaveAttribute(
    "data-chem-window-width",
    String(initialMinimapWindow.width),
  );
  await expect(minimapVisibleWindow).toHaveAttribute(
    "data-chem-window-height",
    String(initialMinimapWindow.height),
  );

  await page.getByTestId("chem-node-alcohol").focus();
  await expect(viewport).toHaveAttribute("data-chem-trace-active", "true");
  await expect(page.getByTestId("chem-trace-preview")).toBeVisible();
  await expect(page.getByTestId("chem-trace-preview")).toContainText(/Alcohol/);
  await expect(page.getByTestId("chem-trace-preview")).toContainText(/7 connected pathways/);
  await expect(page.getByTestId("chem-node-pathway-count-alcohol")).toHaveAttribute(
    "data-chem-pathway-count-label",
    "4 incoming · 3 outgoing",
  );
  await expect(page.getByTestId("chem-node-alcohol")).toHaveAttribute(
    "data-chem-pathway-bias",
    "incoming-heavy",
  );
  await expect(page.getByTestId("chem-node-pathway-bias-alcohol")).toHaveAttribute(
    "data-chem-pathway-bias",
    "incoming-heavy",
  );
  await expect(page.getByTestId("chem-node-pathway-balance-alcohol")).toHaveAttribute(
    "data-chem-incoming-share",
    "57",
  );
  await expect(page.getByTestId("chem-node-pathway-balance-alcohol")).toHaveAttribute(
    "data-chem-outgoing-share",
    "43",
  );
  await expect(page.getByTestId("chem-node-pathway-incoming-alcohol")).toHaveText(/4 in/);
  await expect(page.getByTestId("chem-node-pathway-outgoing-alcohol")).toHaveText(/3 out/);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("chem-node-details")).toBeVisible();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "node");
  await expect(viewport).toHaveAttribute(
    "data-chem-camera-behavior",
    "preserve-context",
  );
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "active-context");
  const nodeScale = await viewport.getAttribute("data-chem-scale");
  const fitScaleNumber = Number(fitScale);
  const nodeScaleNumber = Number(nodeScale);
  expect(nodeScaleNumber).toBeLessThanOrEqual(fitScaleNumber + 0.05);
  expect(nodeScaleNumber).toBeLessThanOrEqual(0.95);
  await expectChemistryGraphItemsInsideViewport(page, [
    "chem-node-alcohol",
    "chem-node-alkene",
    "chem-node-aldehyde",
    "chem-node-ketone",
  ]);
  await expectNoChemistryEdgeLabelNodeTitleOverlap(page);
  const alcoholOverlapPoint = await page.evaluate(() => {
    const node = document.querySelector('[data-testid="chem-node-alcohol"]');
    const candidates = Array.from(
      document.querySelectorAll(
        '[data-testid^="chem-edge-alcohol-"], [data-testid^="chem-edge-"][data-testid*="-alcohol-"]',
      ),
    );

    if (!(node instanceof HTMLElement)) {
      return null;
    }

    const nodeRect = node.getBoundingClientRect();
    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) {
        continue;
      }

      const edgeRect = candidate.getBoundingClientRect();
      const left = Math.max(nodeRect.left, edgeRect.left);
      const right = Math.min(nodeRect.right, edgeRect.right);
      const top = Math.max(nodeRect.top, edgeRect.top);
      const bottom = Math.min(nodeRect.bottom, edgeRect.bottom);

      if (right > left && bottom > top) {
        return {
          x: (left + right) / 2,
          y: (top + bottom) / 2,
        };
      }
    }

    return {
      x: nodeRect.left + nodeRect.width / 2,
      y: nodeRect.top + nodeRect.height / 2,
    };
  });
  if (!alcoholOverlapPoint) {
    throw new Error("Could not resolve an Alcohol hover overlap point.");
  }
  const hoverLayoutBefore = await page.evaluate(() => {
    const toolbar = document.querySelector('[data-testid="chemistry-graph-toolbar"]');
    const viewportElement = document.querySelector(
      '[data-testid="chemistry-graph-viewport"]',
    );
    if (
      !(toolbar instanceof HTMLElement) ||
      !(viewportElement instanceof HTMLElement)
    ) {
      return null;
    }
    const toolbarRect = toolbar.getBoundingClientRect();
    const viewportRect = viewportElement.getBoundingClientRect();
    return {
      toolbarHeight: toolbarRect.height,
      viewportTop: viewportRect.top,
    };
  });
  if (!hoverLayoutBefore) {
    throw new Error("Could not resolve chemistry hover layout metrics.");
  }
  await page.mouse.move(alcoholOverlapPoint.x, alcoholOverlapPoint.y);
  await expect(viewport).toHaveAttribute("data-chem-hover-target", /node:alcohol/);
  await expect(viewport).toHaveAttribute("data-chem-hover-camera", "none");
  const overlapHoverScale = await viewport.getAttribute("data-chem-scale");
  await waitForStableChemistryCamera(page);
  await expect(viewport).toHaveAttribute("data-chem-scale", overlapHoverScale ?? "");
  const hoverLayoutAfter = await page.evaluate(() => {
    const toolbar = document.querySelector('[data-testid="chemistry-graph-toolbar"]');
    const viewportElement = document.querySelector(
      '[data-testid="chemistry-graph-viewport"]',
    );
    if (
      !(toolbar instanceof HTMLElement) ||
      !(viewportElement instanceof HTMLElement)
    ) {
      return null;
    }
    const toolbarRect = toolbar.getBoundingClientRect();
    const viewportRect = viewportElement.getBoundingClientRect();
    return {
      toolbarHeight: toolbarRect.height,
      viewportTop: viewportRect.top,
    };
  });
  if (!hoverLayoutAfter) {
    throw new Error("Could not resolve chemistry hover layout metrics after hover.");
  }
  expect(
    Math.abs(hoverLayoutAfter.toolbarHeight - hoverLayoutBefore.toolbarHeight),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(hoverLayoutAfter.viewportTop - hoverLayoutBefore.viewportTop),
  ).toBeLessThanOrEqual(1);
  await page.mouse.click(alcoholOverlapPoint.x, alcoholOverlapPoint.y);
  await expect(page.getByTestId("chem-node-details")).toBeVisible();
  await expect(page.getByTestId("chemistry-selection-summary")).toContainText(
    /selected group: alcohol/i,
  );
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "node");

  const windowScrollBefore = await page.evaluate(() => window.scrollY);
  const inspectorBox = await inspector.boundingBox();
  if (!inspectorBox) {
    throw new Error("Chemistry inspector did not return a bounding box.");
  }

  await page.mouse.move(
    inspectorBox.x + inspectorBox.width / 2,
    inspectorBox.y + Math.min(220, inspectorBox.height - 40),
  );
  await inspector.evaluate((element) => {
    element.scrollTop = 240;
  });

  const inspectorState = await inspector.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(inspectorState.overflowY).toBe("auto");
  expect(inspectorState.scrollHeight).toBeGreaterThan(inspectorState.clientHeight);
  expect(inspectorState.scrollTop).toBeGreaterThan(0);

  const windowScrollAfter = await page.evaluate(() => window.scrollY);
  expect(Math.abs(windowScrollAfter - windowScrollBefore)).toBeLessThanOrEqual(4);

  const graphRect = await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  expect(graphRect.bottom).toBeGreaterThan(0);

  await page.getByText("Clear selection").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "full-graph");
  await expect(viewport).toHaveAttribute("data-chem-scale", fitScale ?? "");

  await page.getByTestId("chem-route-start").selectOption("alkene");
  await page.getByTestId("chem-route-target").selectOption("carboxylic-acid");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chemistry-route-panel")).toBeVisible();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "route");
  await expect(viewport).toHaveAttribute(
    "data-chem-camera-behavior",
    "route-focus",
  );
  await expect(viewport).toHaveAttribute("data-chem-fit-scope", "active-context");
  const routeProgress = page.getByTestId("chem-route-progress");
  await expect(routeProgress).toBeVisible();
  await expect(routeProgress).toHaveAttribute("data-chem-route-step-count", "3");
  await expect(routeProgress).toContainText(/alkene.*carboxylic acid.*3 steps/i);
  await expect(minimap).toHaveAttribute("data-chem-minimap-camera-mode", "route");
  await expect(page.getByTestId("chem-minimap-active-scope")).toHaveAttribute(
    "data-chem-camera-frame-tone",
    "route",
  );
  await expect(page.getByTestId("chem-route-progress-step-1")).toHaveText("1");
  await expect(page.getByTestId("chem-route-progress-step-3")).toHaveText("3");
  const routeScale = await viewport.getAttribute("data-chem-scale");
  expect(Number(routeScale)).toBeGreaterThan(Number(fitScale));
  await expect(page.getByTestId("chemistry-selection-summary")).toContainText(
    /route: alkene to carboxylic acid \(3 steps\)/i,
  );
  await expect(page.getByTestId("chem-node-alkene")).toHaveAttribute(
    "data-chem-route-context",
    "endpoint",
  );
  await expect(page.getByTestId("chem-node-alkene")).toHaveAttribute(
    "data-chem-route-step",
    "1",
  );
  await expect(page.getByTestId("chem-node-route-step-alkene")).toHaveText("1");
  await expect(page.getByTestId("chem-node-route-stage-alkene")).toHaveText(/start/i);
  await expect(page.getByTestId("chem-node-route-stage-alkene")).toHaveAttribute(
    "data-chem-route-stage-label",
    "Start",
  );
  await expect(page.getByTestId("chem-node-alcohol")).toHaveAttribute(
    "data-chem-route-context",
    "route",
  );
  await expect(page.getByTestId("chem-node-route-step-alcohol")).toHaveText("2");
  await expect(page.getByTestId("chem-node-route-stage-alcohol")).toHaveText(/step 2/i);
  await expect(page.getByTestId("chem-node-carboxylic-acid")).toHaveAttribute(
    "data-chem-route-step",
    "4",
  );
  await expect(page.getByTestId("chem-node-route-step-carboxylic-acid")).toHaveText("4");
  await expect(page.getByTestId("chem-node-route-stage-carboxylic-acid")).toHaveText(/target/i);
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-route-context",
    "route",
  );
  await expectChemistryGraphItemsInsideViewport(page, [
    "chem-edge-path-alkene-to-alcohol-hydration",
    "chem-edge-direction-alkene-to-alcohol-hydration",
    "chem-edge-alkene-to-alcohol-hydration",
    "chem-edge-path-alcohol-to-aldehyde-oxidation",
    "chem-edge-direction-alcohol-to-aldehyde-oxidation",
    "chem-edge-alcohol-to-aldehyde-oxidation",
    "chem-edge-path-aldehyde-to-carboxylic-acid-oxidation",
    "chem-edge-direction-aldehyde-to-carboxylic-acid-oxidation",
    "chem-edge-aldehyde-to-carboxylic-acid-oxidation",
  ]);
  await expectChemistryEdgeLabelsReadable(page, [
    "alkene-to-alcohol-hydration",
    "alcohol-to-aldehyde-oxidation",
    "aldehyde-to-carboxylic-acid-oxidation",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "alkene-to-alcohol-hydration",
    "alcohol-to-aldehyde-oxidation",
    "aldehyde-to-carboxylic-acid-oxidation",
  ]);
  await expectNoChemistryEdgeLabelNodeTitleOverlap(page);
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-route-step",
    "1",
  );
  await expect(page.getByTestId("chem-edge-alkene-to-alcohol-hydration")).toHaveAttribute(
    "data-chem-label-density",
    "detailed",
  );
  await expect(
    page.getByTestId("chem-edge-route-step-alkene-to-alcohol-hydration"),
  ).toHaveText("1");
  await expect(page.getByTestId("chem-edge-path-alkene-to-alcohol-hydration")).toHaveAttribute(
    "pointer-events",
    "none",
  );
  await expect(page.getByTestId("chem-edge-hitbox-alkene-to-alcohol-hydration")).toHaveAttribute(
    "pointer-events",
    "stroke",
  );
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /representative-example step/i,
  );

  await page.locator('[data-testid^="chem-route-step-"] button').nth(1).click();
  await expect(page.getByTestId("chem-edge-details")).toBeVisible();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "edge");
  await expect(page.getByTestId("chem-edge-details")).toContainText(/primary alcohols only/i);
  await expect(page.getByText(/^Ionic equation$/i)).toHaveCount(0);
  await page.getByTestId("chem-route-view-results").click();

  await page.getByTestId("chem-route-start").selectOption("alcohol");
  await page.getByTestId("chem-route-target").selectOption("ester");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /needs extra co-reactant/i,
  );
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /also needs: alcohol family/i,
  );
  await page.locator('[data-testid^="chem-route-step-"] button').last().click();
  await expect(page.getByTestId("chem-edge-details")).toContainText(
    /concentrated sulfuric acid/i,
  );
  await expect(
    page
      .getByTestId("chem-edge-details")
      .locator('[data-chem-notation-source="H2SO4(l)"]'),
  ).toHaveCount(1);
  await expect(
    page
      .getByTestId("chem-edge-details")
      .locator(
        '[data-chem-notation-source="CH3COOH(l) + CH3CH2OH(l) <=> CH3COOCH2CH3(l) + H2O(l)"]',
      ),
  ).toHaveCount(1);
  await expectNoChemistryEdgeLabelNodeTitleOverlap(page);
  await expectChemistryEdgeLabelsReadable(page, [
    "carboxylic-acid-to-ester-esterification",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "carboxylic-acid-to-ester-esterification",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("alkene");
  await page.getByTestId("chem-route-target").selectOption("haloalkane");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "route");
  await expectChemistryGraphItemsInsideViewport(page, [
    "chem-edge-path-alkene-to-haloalkane-hydrohalogenation",
    "chem-edge-direction-alkene-to-haloalkane-hydrohalogenation",
    "chem-edge-alkene-to-haloalkane-hydrohalogenation",
    "chem-node-alkene",
    "chem-node-haloalkane",
  ]);
  await expectChemistryEdgeLabelsReadable(page, [
    "alkene-to-haloalkane-hydrohalogenation",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "alkene-to-haloalkane-hydrohalogenation",
  ]);
  await expect(
    page.getByTestId("chem-edge-alkene-to-haloalkane-hydrohalogenation"),
  ).toHaveAttribute("data-chem-map-label", "Add HX");
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("haloalkane");
  await page.getByTestId("chem-route-target").selectOption("nitrile");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "haloalkane-to-nitrile-cyanide-substitution",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "haloalkane-to-nitrile-cyanide-substitution",
  ]);
  await expect(
    page.getByTestId("chem-edge-haloalkane-to-nitrile-cyanide-substitution"),
  ).toHaveAttribute("data-chem-map-label", "Add CN");
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("haloalkane");
  await page.getByTestId("chem-route-target").selectOption("amine");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "haloalkane-to-amine-ammonia-substitution",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "haloalkane-to-amine-ammonia-substitution",
  ]);
  await expect(
    page.getByTestId("chem-edge-haloalkane-to-amine-ammonia-substitution"),
  ).toHaveAttribute("data-chem-map-label", "Add NH3");
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("carboxylic-acid");
  await page.getByTestId("chem-route-target").selectOption("acyl-chloride");
  await expect(page.getByTestId("chem-route-start")).toHaveValue(
    "carboxylic-acid",
  );
  await expect(page.getByTestId("chem-route-target")).toHaveValue(
    "acyl-chloride",
  );
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "carboxylic-acid-to-acyl-chloride-chlorination",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "carboxylic-acid-to-acyl-chloride-chlorination",
  ]);
  await expectChemistryGraphItemsInsideViewport(page, [
    "chem-edge-path-carboxylic-acid-to-acyl-chloride-chlorination",
    "chem-edge-direction-carboxylic-acid-to-acyl-chloride-chlorination",
    "chem-edge-carboxylic-acid-to-acyl-chloride-chlorination",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("ester");
  await page.getByTestId("chem-route-target").selectOption("carboxylate-salt");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "ester-to-carboxylate-salt-alkaline-hydrolysis",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "ester-to-carboxylate-salt-alkaline-hydrolysis",
  ]);
  await expectChemistryGraphItemsInsideViewport(page, [
    "chem-edge-path-ester-to-carboxylate-salt-alkaline-hydrolysis",
    "chem-edge-direction-ester-to-carboxylate-salt-alkaline-hydrolysis",
    "chem-edge-ester-to-carboxylate-salt-alkaline-hydrolysis",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("acyl-chloride");
  await page.getByTestId("chem-route-target").selectOption("ester");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "acyl-chloride-to-ester-alcoholysis",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "acyl-chloride-to-ester-alcoholysis",
  ]);
  await expectChemistryGraphItemsInsideViewport(page, [
    "chem-edge-path-acyl-chloride-to-ester-alcoholysis",
    "chem-edge-direction-acyl-chloride-to-ester-alcoholysis",
    "chem-edge-acyl-chloride-to-ester-alcoholysis",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("acyl-chloride");
  await page.getByTestId("chem-route-target").selectOption("amide");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "acyl-chloride-to-amide-ammonolysis",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "acyl-chloride-to-amide-ammonolysis",
  ]);
  await expectChemistryGraphItemsInsideViewport(page, [
    "chem-edge-path-acyl-chloride-to-amide-ammonolysis",
    "chem-edge-direction-acyl-chloride-to-amide-ammonolysis",
    "chem-edge-acyl-chloride-to-amide-ammonolysis",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("carboxylic-acid");
  await page.getByTestId("chem-route-target").selectOption("amide");
  await expect(page.getByTestId("chem-route-start")).toHaveValue(
    "carboxylic-acid",
  );
  await expect(page.getByTestId("chem-route-target")).toHaveValue("amide");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "2",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "carboxylic-acid-to-acyl-chloride-chlorination",
    "acyl-chloride-to-amide-ammonolysis",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "carboxylic-acid-to-acyl-chloride-chlorination",
    "acyl-chloride-to-amide-ammonolysis",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("aldehyde");
  await page.getByTestId("chem-route-target").selectOption("hydroxynitrile");
  await expect(page.getByTestId("chem-route-start")).toHaveValue("aldehyde");
  await expect(page.getByTestId("chem-route-target")).toHaveValue(
    "hydroxynitrile",
  );
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "aldehyde-to-hydroxynitrile-cyanohydrin-addition",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "aldehyde-to-hydroxynitrile-cyanohydrin-addition",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-route-start").selectOption("ketone");
  await page.getByTestId("chem-route-target").selectOption("hydroxynitrile");
  await expect(page.getByTestId("chem-route-start")).toHaveValue("ketone");
  await expect(page.getByTestId("chem-route-target")).toHaveValue(
    "hydroxynitrile",
  );
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toHaveAttribute(
    "data-chem-route-step-count",
    "1",
  );
  await expectChemistryEdgeLabelsReadable(page, [
    "ketone-to-hydroxynitrile-cyanohydrin-addition",
  ]);
  await expectChemistryActiveRouteLabelsOwned(page, [
    "ketone-to-hydroxynitrile-cyanohydrin-addition",
  ]);
  await page.getByTestId("chem-route-clear").click();
  await expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");

  await page.getByTestId("chem-node-alcohol").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("chem-node-compare-outgoing-alcohol-to-aldehyde-oxidation").click();
  await expect(page.getByTestId("chemistry-compare-panel")).toBeVisible();
  await page.getByTestId("chem-compare-show-routes").click();
  await expect(page.getByTestId("chemistry-route-panel")).toBeVisible();
  await expect(page.getByTestId("chemistry-selection-summary")).toContainText(
    /route: alcohol to aldehyde \(1 step\)/i,
  );

  await gotoAndExpectOk(page, "/zh-HK/tools/chemistry-reaction-mind-map");
  await page.getByTestId("chemistry-worksurface").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("chem-graph-legend")).toContainText(/圖例/);
  await expect(page.getByTestId("chem-camera-status")).toContainText(/視圖：完整反應圖譜/);
  await expect(page.getByTestId("chem-scope-status")).toContainText(/目前視圖有/);
  await expect(page.getByTestId("chem-preview-status")).toContainText(/預覽：/);
  await page.getByTestId("chem-node-alcohol").focus();
  await expect(page.getByTestId("chem-node-pathway-count-alcohol")).toHaveAttribute(
    "data-chem-pathway-count-label",
    "4 入 · 3 出",
  );
  await expect(page.getByTestId("chem-node-pathway-incoming-alcohol")).toHaveText(/4 入/);
  await expect(page.getByTestId("chem-node-pathway-outgoing-alcohol")).toHaveText(/3 出/);
  await page.getByTestId("chem-route-start").selectOption("alcohol");
  await page.getByTestId("chem-route-target").selectOption("ester");
  await page.getByTestId("chem-route-search").click();
  await expect(page.getByTestId("chem-route-progress")).toContainText(/路線路徑/);
  await expect(page.getByTestId("chem-minimap-camera-mode-label")).toHaveText(/路線/);
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(/路線 1/);
  await expect(page.getByTestId("chemistry-selection-summary")).toContainText(
    /路線：由 醇 到 酯/,
  );
  await expect(page.getByTestId("chemistry-route-panel")).toContainText(
    /需要額外共反應物/,
  );
  await page.locator('[data-testid^="chem-route-step-"] button').last().click();
  await expect(page.getByTestId("chem-edge-details")).toContainText(/醇家族/);
  await expect(page.getByTestId("chem-edge-details")).toContainText(/代表性例子/);
  await expect(page.getByTestId("chem-edge-details")).toContainText(/濃硫酸/);
  await expect(
    page
      .getByTestId("chem-edge-details")
      .locator('[data-chem-notation-source="H2SO4(l)"]'),
  ).toHaveCount(1);

  guard.assertNoActionableIssues();
});
