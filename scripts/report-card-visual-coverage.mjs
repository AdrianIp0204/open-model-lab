import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function extractRecordMap(source, constName) {
  const match = source.match(
    new RegExp(`const ${constName}:[^{]+\\{([\\s\\S]*?)\\};`),
  );

  if (!match) {
    return new Map();
  }

  const entries = new Map();
  const body = match[1];
  const recordPattern = /(?:"([^"]+)"|([A-Za-z0-9_-]+)):\s*"([^"]+)"/g;

  for (const entry of body.matchAll(recordPattern)) {
    entries.set(entry[1] ?? entry[2], entry[3]);
  }

  return entries;
}

function extractNestedMotifRecord(source, constName) {
  const match = source.match(
    new RegExp(`const ${constName}:[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\n\\};`),
  );

  if (!match) {
    return new Map();
  }

  const entries = new Map();
  const body = match[1];
  const recordPattern =
    /(?:"([^"]+)"|([A-Za-z0-9_-]+)):\s*\{[\s\S]*?motif:\s*"([^"]+)"/g;

  for (const entry of body.matchAll(recordPattern)) {
    entries.set(entry[1] ?? entry[2], entry[3]);
  }

  return entries;
}

const descriptorSource = readFileSync(
  path.join(repoRoot, "components/visuals/learningVisualDescriptors.ts"),
  "utf8",
);
const exactConceptMotifs = extractRecordMap(descriptorSource, "exactConceptMotifs");
const exactTopicMotifs = extractRecordMap(descriptorSource, "exactTopicMotifs");
const exactSubjectMotifs = extractRecordMap(descriptorSource, "exactSubjectMotifs");
const exactStarterTrackMotifs = extractNestedMotifRecord(
  descriptorSource,
  "exactStarterTrackMotifs",
);

const motifRules = [
  [/escape/, "escape-velocity"],
  [/kepler|orbital period/, "kepler-period"],
  [/potential energy|gravity well|gravitational potential/, "gravitational-potential"],
  [/gravitational field|inverse square|test mass/, "gravitational-field"],
  [/orbital speed|circular orbit/, "orbital-speed"],
  [/gravity|gravitational|orbit/, "gravity-orbits"],
  [/circular|centripetal/, "uniform-circular-motion"],
  [/damping|resonance|driving force|response curve/, "damping-resonance"],
  [/oscillation energy|kinetic energy|turning points/, "oscillation-energy"],
  [/harmonic|oscillation|oscillator|spring/, "simple-harmonic-motion"],
  [/rotational inertia|angular momentum|moment of inertia|flywheel|rotor/, "rotational-inertia"],
  [/momentum|impulse/, "momentum-carts"],
  [/collision|elastic|inelastic|rebound/, "collisions"],
  [/vector|component|projection/, "vectors-components"],
  [/torque|rotation|lever|moment/, "torque"],
  [/projectile|trajectory|parabola/, "projectile-motion"],
  [/standing|node|antinode|harmonic pipe|resonance/, "standing-wave"],
  [/sound|pitch|doppler|beat|loudness|frequency/, "sound-pitch"],
  [/wave|wavelength|interference|fringe|diffraction/, "wave-motion"],
  [/snell|refraction|refractive index/, "refraction-snell"],
  [/dispersion|prism|color spectrum|colour spectrum|rainbow/, "dispersion-prism"],
  [/total internal|critical angle/, "total-internal-reflection"],
  [/lens|image formation|focal/, "lens-imaging"],
  [/mirror|reflection/, "mirror-reflection"],
  [/resolution|imaging limit|aperture/, "optical-resolution"],
  [/optic|lens|mirror|refraction|reflection|ray|snell|image|prism|dispersion/, "optics-ray"],
  [/\brc\b|time constant|charging|discharging/, "rc-time-constant"],
  [/capacitance|capacitor|charge storage|stored electric energy/, "capacitance-storage"],
  [/kirchhoff|junction rule|loop rule|voltage balance|current conservation/, "kirchhoff-rules"],
  [/equivalent resistance|mixed resistor|resistor group/, "equivalent-resistance"],
  [/series and parallel|series circuits|parallel circuits|branch current/, "series-parallel-circuit"],
  [/power and energy|circuit power|watt|terminal power/, "circuit-power"],
  [/internal resistance|terminal voltage|non-ideal source/, "internal-resistance"],
  [/circuit|resistor|battery|capacitor|voltage/, "circuit"],
  [/electric|field|charge|current|magnetic/, "electric-field"],
  [/heat|temperature|thermal|specific heat|phase change|internal energy/, "thermal-energy"],
  [/bernoulli|venturi|height term/, "fluid-bernoulli"],
  [/continuity|flow rate|cross-sectional area/, "fluid-continuity"],
  [/drag|terminal velocity|fluid resistance/, "fluid-drag"],
  [/hydrostatic|pressure|fluid statics/, "fluid-pressure"],
  [/fluid|buoyancy|archimedes|flow/, "fluid-buoyancy"],
  [/breadth[- ]?first|layered frontier|bfs/, "breadth-first-layers"],
  [/depth[- ]?first|backtracking|dfs/, "depth-first-backtracking"],
  [/frontier|visited state|visited nodes/, "frontier-visited"],
  [/adjacency|graph representation|network graph/, "graph-network"],
  [/rational|asymptote/, "rational-asymptote"],
  [/exponential|growth|decay|logarithm/, "exponential-change"],
  [/graph|transform|function|curve/, "graph-transformations"],
  [/derivative|slope|tangent|secant|calculus|rate of change/, "calculus-slope"],
  [/limit|continuity|approaching|epsilon|delta/, "limit-approach"],
  [/optimization|maxima|minima|constraint|area/, "optimization"],
  [/complex|imaginary|real plane/, "complex-plane"],
  [/polar|radius|angle|parametric/, "polar-coordinates"],
  [/trig|unit circle|sine|cosine|inverse trig/, "unit-circle"],
  [/quantum|atom|atomic|spectra|bohr|photoelectric|matter wave|de broglie/, "atomic-spectra"],
  [/radioactivity|half-life|decay|nuclear/, "radioactivity"],
  [/reaction|equilibrium|stoichiometry|yield|reagent|collision/, "chemistry-reaction"],
  [/acid|base|ph|buffer|chemistry|solution/, "acid-base"],
  [/binary|search|algorithm|halving|frontier|visited|sorting/, "binary-search"],
];

const challengeRules = [
  [/beat|pulse/, "sound-beats"],
  [/doppler|higher ahead|lower behind|source|observer/, "sound-doppler"],
  [/pitch|frequency|loudness|sound|carrier/, "sound-pitch"],
  [/\brc\b|time constant|charging|discharging/, "rc-time-constant"],
  [/capacitor|capacitance|charge storage|stored electric/, "capacitance-storage"],
  [/kirchhoff|junction|loop rule|voltage balance|current conservation/, "kirchhoff-rules"],
  [/equivalent resistance|mixed resistor|resistor group/, "equivalent-resistance"],
  [/series and parallel|series circuits|parallel circuits|branch current|bulb brightness/, "series-parallel-circuit"],
  [/internal resistance|terminal voltage|non-ideal source/, "internal-resistance"],
  [/power-energy|power in circuits|circuit power|watt|current.*power|voltage.*power|resistor.*power|battery.*power|power.*circuit/, "circuit-power"],
  [/breadth[- ]?first|layered frontier|bfs/, "breadth-first-layers"],
  [/depth[- ]?first|backtracking|dfs/, "depth-first-backtracking"],
  [/frontier|visited state|visited nodes/, "frontier-visited"],
  [/adjacency|graph representation|network graph/, "graph-network"],
  [/rational|asymptote/, "rational-asymptote"],
  [/exponential|growth|decay|logarithm/, "exponential-change"],
  [/standing|node|antinode|resonance|harmonic|pipe/, "standing-wave"],
  [/period|centripetal|circular|orbit|radius/, "uniform-circular-motion"],
  [/damping|resonance|driving force|response/, "damping-resonance"],
  [/joule|energy|spring|oscillat|amplitude/, "oscillation-energy"],
  [/collision|rebound|cart|elastic|inelastic/, "collisions"],
  [/momentum|impulse|force pulse/, "momentum-carts"],
  [/angular momentum|rotational inertia|moment of inertia|mass radius|spin/, "rotational-inertia"],
  [/snell|refraction|refractive index/, "refraction-snell"],
  [/dispersion|prism|color spectrum|colour spectrum|rainbow/, "dispersion-prism"],
  [/total internal|critical angle/, "total-internal-reflection"],
  [/lens|image formation|focal/, "lens-imaging"],
  [/mirror|reflection/, "mirror-reflection"],
  [/resolution|imaging limit|aperture/, "optical-resolution"],
  [/lens|mirror|ray|refraction|snell|image|fringe|slit/, "optics-ray"],
  [/battery|resistor|circuit|voltage|current|power|watt|ohm|capacitor|load/, "circuit"],
  [/temperature|thermal|phase|heat|heater/, "thermal-energy"],
  [/bernoulli|venturi|height term/, "fluid-bernoulli"],
  [/continuity|flow rate|cross-sectional area/, "fluid-continuity"],
  [/drag|terminal velocity|fluid resistance/, "fluid-drag"],
  [/hydrostatic|pressure/, "fluid-pressure"],
  [/fluid|buoyant|flow/, "fluid-buoyancy"],
];

function compact(parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function pickMotif(text, rules = motifRules) {
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function getConceptMotif(concept) {
  return (
    exactConceptMotifs.get(concept.slug) ??
    pickMotif(compact([
      concept.slug,
      concept.title,
      concept.subject,
      concept.topic,
      concept.subtopic,
      ...(concept.tags ?? []),
    ]))
  );
}

function getTopicMotif(topic) {
  return (
    exactTopicMotifs.get(topic.slug) ??
    pickMotif(compact([topic.slug, topic.title, topic.subject, topic.description]))
  );
}

function hasRawLatex(value) {
  return /\\(?:mathrm|,)|\$.+\$|\\\(|\\\)/.test(value);
}

const concepts = readJson("content/catalog/concepts.json");
const subjects = readJson("content/catalog/subjects.json");
const starterTracks = readJson("content/catalog/starter-tracks.json");
const topics = readJson("content/catalog/topics.json");
const topicTests = readJson("content/catalog/topic-tests.json");
const testPacks = readJson("content/catalog/test-packs.json");
const topicMap = new Map(topics.map((topic) => [topic.slug, topic]));
const conceptByContentFile = new Map(
  concepts.map((concept) => [concept.contentFile ?? concept.slug, concept]),
);

const conceptRows = concepts.map((concept) => ({
  slug: concept.slug,
  title: concept.title,
  motif: getConceptMotif(concept),
}));
const conceptFallbacks = conceptRows.filter((row) => !row.motif);
const motifBuckets = new Map();

for (const row of conceptRows) {
  if (!row.motif) {
    continue;
  }

  const bucket = motifBuckets.get(row.motif) ?? [];
  bucket.push(row.slug);
  motifBuckets.set(row.motif, bucket);
}

const challengeRows = [];
const conceptFiles = readdirSync(path.join(repoRoot, "content/concepts"))
  .filter((name) => name.endsWith(".json"));

for (const fileName of conceptFiles) {
  const contentFile = fileName.replace(/\.json$/, "");
  const concept = conceptByContentFile.get(contentFile);
  const content = readJson(`content/concepts/${fileName}`);

  for (const item of content.challengeMode?.items ?? []) {
    const text = compact([
      item.id,
      item.title,
      item.prompt,
      item.style,
      concept?.slug,
      concept?.title,
      concept?.topic,
    ]);
    const motif = pickMotif(text, challengeRules) ?? (concept ? getConceptMotif(concept) : null);
    challengeRows.push({
      id: item.id,
      title: item.title,
      conceptSlug: concept?.slug ?? contentFile,
      motif,
      rawLatex: hasRawLatex(item.prompt ?? ""),
    });
  }
}

const conceptTestRows = concepts.map((concept) => ({
  id: concept.slug,
  motif: getConceptMotif(concept),
}));
const topicTestRows = topicTests.map((entry) => {
  const topic = topicMap.get(entry.topicSlug);
  return {
    id: entry.topicSlug,
    motif: topic ? getTopicMotif(topic) : pickMotif(entry.topicSlug),
  };
});
const packRows = testPacks.map((pack) => ({
  id: pack.slug,
  motif:
    pack.includedTopicSlugs
      ?.map((slug) => topicMap.get(slug))
      .filter(Boolean)
      .map(getTopicMotif)
      .find(Boolean) ?? pickMotif(compact([pack.slug, pack.title, pack.summary])),
}));
const subjectRows = subjects.map((subject) => ({
  id: subject.slug,
  motif:
    exactSubjectMotifs.get(subject.slug) ??
    exactSubjectMotifs.get(subject.title.toLowerCase()) ??
    pickMotif(compact([subject.slug, subject.title, subject.description])),
}));
const starterTrackRows = starterTracks.map((track) => ({
  id: track.slug,
  motif:
    exactStarterTrackMotifs.get(track.slug) ??
    pickMotif(compact([
      track.slug,
      track.title,
      track.summary,
      ...(track.highlights ?? []),
      ...(track.concepts ?? []).flatMap((concept) => [
        concept.slug,
        concept.title,
        concept.subject,
        concept.topic,
        ...(concept.tags ?? []),
      ]),
    ])),
}));

console.log("Card visual coverage report");
console.log("===========================");
console.log(`Concepts with topic-specific motifs: ${conceptRows.length - conceptFallbacks.length}/${conceptRows.length}`);
console.log(
  `Potential generic concept fallbacks: ${conceptFallbacks.length}${
    conceptFallbacks.length ? ` (${conceptFallbacks.map((row) => row.slug).join(", ")})` : ""
  }`,
);
console.log("Repeated concept motif buckets with four or more concepts:");
for (const [motif, slugs] of [...motifBuckets.entries()].filter(([, slugs]) => slugs.length >= 4)) {
  console.log(`- ${motif}: ${slugs.length} concepts`);
}
console.log(`Challenge cards with meaningful motifs: ${challengeRows.filter((row) => row.motif).length}/${challengeRows.length}`);
console.log(`Challenge prompts containing raw inline math/unit markup in source: ${challengeRows.filter((row) => row.rawLatex).length}/${challengeRows.length}`);
console.log(`Concept test visuals with motifs: ${conceptTestRows.filter((row) => row.motif).length}/${conceptTestRows.length}`);
console.log(`Topic test visuals with motifs: ${topicTestRows.filter((row) => row.motif).length}/${topicTestRows.length}`);
console.log(`Pack test visuals with motifs: ${packRows.filter((row) => row.motif).length}/${packRows.length}`);
console.log(`Subject visuals with motifs: ${subjectRows.filter((row) => row.motif).length}/${subjectRows.length}`);
console.log(`Starter track visuals with motifs: ${starterTrackRows.filter((row) => row.motif).length}/${starterTrackRows.length}`);
