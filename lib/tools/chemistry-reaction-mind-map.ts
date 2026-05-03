import type { AppLocale } from "@/i18n/routing";
import { chemistryReactionLocaleOverlays } from "./chemistry-reaction-mind-map.locales";

/**
 * Editorial rules for this dataset:
 * - Nodes represent functional-group families or homologous-series families, not single compounds.
 * - Edges represent reactions or conversions between families, and reaction metadata belongs on the edge.
 * - Node physical properties should stay family-level trends or tendencies, not falsely universal exact values.
 * - Representative examples must be marked explicitly as representative in the data.
 * - Multi-reactant reactions must record additional organic co-reactants explicitly.
 * - Subgroup-specific reactions must record applicability explicitly instead of implying the whole family behaves identically.
 */

type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
  : never;

type NonEmptyList<T> = readonly [T, ...T[]];

export type ChemistryDetailItem =
  | string
  | {
      name: string;
      formula?: string;
    };

export type ChemistryRepresentativeExample = {
  kind: "representative-example";
  text: string;
};

export type ChemistryNodeProperty = {
  summary: string;
  details?: readonly string[];
  representativeExample?: ChemistryRepresentativeExample;
};

type ChemistryNomenclature = AtLeastOne<
  {
    suffix?: string;
    prefix?: string;
  },
  "suffix" | "prefix"
>;

type ChemistryNodeDefinition = {
  id: string;
  name: string;
  nomenclature: ChemistryNomenclature;
  generalFormula: string;
  functionalGroup: string;
  representativeStructureLabel?: string;
  functionalGroupVisual?: string;
  boilingPoint: ChemistryNodeProperty;
  solubility: ChemistryNodeProperty;
  acidityBasicity: ChemistryNodeProperty;
  notableProperties: NonEmptyList<string>;
};

function representativeExample(text: string): ChemistryRepresentativeExample {
  return {
    kind: "representative-example",
    text,
  };
}

export const chemistryReactionNodes = [
  {
    id: "alkene",
    name: "Alkene",
    nomenclature: {
      suffix: "-ene",
      prefix: "alkenyl-",
    },
    generalFormula: "CnH2n",
    functionalGroup: "C=C double bond",
    representativeStructureLabel: "Representative member: ethene, CH2=CH2",
    functionalGroupVisual: "C=C",
    boilingPoint: {
      summary:
        "Usually low because alkenes cannot hydrogen bond and rely mainly on London forces.",
      details: [
        "Boiling point increases as the carbon chain gets longer because the electron cloud becomes more polarizable.",
        "Branching often lowers boiling point because molecules pack less efficiently.",
      ],
      representativeExample: representativeExample(
        "Ethene boils near -104 C, but that value is only a representative small-member example.",
      ),
    },
    solubility: {
      summary: "Essentially insoluble in water but soluble in non-polar organic solvents.",
      details: [
        "The hydrocarbon skeleton is non-polar, so water does not stabilize it well.",
        "Solubility in water stays very poor even as chain length changes.",
      ],
    },
    acidityBasicity: {
      summary: "Essentially neutral overall.",
      details: [
        "Their main reactivity comes from the electron-rich pi bond, not from acidic or basic behavior in water.",
      ],
    },
    notableProperties: [
      "Readily undergo addition reactions because the pi bond is relatively reactive.",
      "Can decolorize bromine water in a typical unsaturation test.",
      "Often used as feedstocks for making alcohols, polymers, and haloalkanes.",
    ],
  },
  {
    id: "haloalkane",
    name: "Haloalkane",
    nomenclature: {
      prefix: "fluoro-, chloro-, bromo-, iodo-",
    },
    generalFormula: "CnH2n+1X",
    functionalGroup: "C-X bond where X is F, Cl, Br, or I",
    representativeStructureLabel: "Representative member: bromoethane, CH3CH2Br",
    functionalGroupVisual: "C-X",
    boilingPoint: {
      summary:
        "Typically higher than the corresponding alkanes because the polar C-X bond and larger halogen increase intermolecular attractions.",
      details: [
        "Heavier halogens usually push boiling point upward because molar mass and polarizability increase.",
        "Haloalkanes still do not hydrogen bond with each other, so they often boil below similar-sized alcohols.",
      ],
      representativeExample: representativeExample(
        "Bromoethane boils much higher than ethane, but still far below ethanol because it cannot hydrogen bond.",
      ),
    },
    solubility: {
      summary: "Usually only slightly soluble or effectively insoluble in water.",
      details: [
        "They cannot form strong hydrogen-bonding interactions with water.",
        "They dissolve more readily in organic solvents than in water.",
      ],
    },
    acidityBasicity: {
      summary: "Essentially neutral in ordinary aqueous conditions.",
      details: [
        "The key feature is the polarized C-X bond, which makes the carbon susceptible to nucleophilic attack.",
      ],
    },
    notableProperties: [
      "Reactivity often increases from chloroalkane to iodoalkane as the C-X bond weakens.",
      "Can undergo substitution or elimination depending on the reagent and conditions.",
      "Useful intermediates for building alcohols, amines, and other substituted products.",
    ],
  },
  {
    id: "alcohol",
    name: "Alcohol",
    nomenclature: {
      suffix: "-ol",
      prefix: "hydroxy-",
    },
    generalFormula: "CnH2n+1OH",
    functionalGroup: "Hydroxyl group, -OH",
    representativeStructureLabel: "Representative member: ethanol, CH3CH2OH",
    functionalGroupVisual: "-OH",
    boilingPoint: {
      summary:
        "Higher than alkanes and haloalkanes of similar size because alcohol molecules can hydrogen bond.",
      details: [
        "Boiling point usually rises as carbon chain length increases because London forces also grow.",
        "Branching often lowers boiling point compared with a straight-chain isomer of similar formula.",
      ],
      representativeExample: representativeExample(
        "Ethanol boils at about 78 C, but that is only a representative member of the family.",
      ),
    },
    solubility: {
      summary:
        "Small alcohols are quite soluble in water, but solubility falls as the hydrocarbon chain gets longer.",
      details: [
        "The -OH group hydrogen bonds strongly with water.",
        "As the non-polar alkyl chain grows, the hydrophobic part dominates and water solubility drops.",
      ],
    },
    acidityBasicity: {
      summary:
        "Mostly neutral in everyday conditions, with only very weak acidic behavior compared with carboxylic acids.",
      details: [
        "The O-H bond can be deprotonated by very strong bases, but typical aqueous solutions do not treat alcohols as strong acids.",
        "The oxygen lone pairs also allow alcohols to act as weak bases in strongly acidic media.",
      ],
    },
    notableProperties: [
      "Can be oxidized, dehydrated, or converted into haloalkanes depending on conditions.",
      "Primary and secondary alcohols differ in their oxidation products, so subgroup scope matters.",
      "Hydrogen bonding strongly affects boiling point and the behavior of smaller alcohols in water.",
    ],
  },
  {
    id: "aldehyde",
    name: "Aldehyde",
    nomenclature: {
      suffix: "-al",
      prefix: "formyl-",
    },
    generalFormula: "RCHO",
    functionalGroup: "Terminal carbonyl group, -CHO",
    representativeStructureLabel: "Representative member: ethanal, CH3CHO",
    functionalGroupVisual: "-CHO",
    boilingPoint: {
      summary:
        "Usually intermediate: higher than comparable alkanes because the carbonyl group is polar, but lower than alcohols because aldehydes do not hydrogen bond to each other.",
      details: [
        "Boiling point rises with molecular size as London forces increase.",
        "Smaller aldehydes are often fairly volatile and easy to oxidize.",
      ],
      representativeExample: representativeExample(
        "Ethanal boils around room temperature, illustrating how aldehydes can stay quite volatile.",
      ),
    },
    solubility: {
      summary:
        "Smaller aldehydes are reasonably soluble in water, but solubility decreases as the carbon chain grows.",
      details: [
        "They can accept hydrogen bonds from water because of the carbonyl oxygen.",
        "They cannot donate hydrogen bonds the way alcohols do, so they are generally less water-friendly than similar small alcohols.",
      ],
    },
    acidityBasicity: {
      summary: "Essentially neutral in simple aqueous descriptions.",
      details: [
        "Aldehydes are not treated as acids or bases in the same way as carboxylic acids or amines.",
        "Their chemistry is dominated more by the polarized C=O bond than by acid-base behavior.",
      ],
    },
    notableProperties: [
      "Readily oxidized to carboxylic acids, often more easily than ketones.",
      "Give positive results with common aldehyde-oxidation tests such as Tollens' reagent or Fehling's solution.",
      "Carbonyl reactivity makes them common intermediates between alcohols and acids.",
    ],
  },
  {
    id: "ketone",
    name: "Ketone",
    nomenclature: {
      suffix: "-one",
      prefix: "oxo-",
    },
    generalFormula: "RCOR'",
    functionalGroup: "Internal carbonyl group, >C=O",
    representativeStructureLabel: "Representative member: propanone, CH3COCH3",
    functionalGroupVisual: ">C=O",
    boilingPoint: {
      summary:
        "Higher than similar alkanes because the carbonyl group is polar, but lower than comparable alcohols because ketones do not hydrogen bond to themselves.",
      details: [
        "Boiling point rises with carbon chain length as dispersion forces increase.",
        "Branching usually lowers boiling point for a given molecular formula.",
      ],
      representativeExample: representativeExample(
        "Propanone boils at about 56 C, which is much lower than ethanol even though both are polar molecules.",
      ),
    },
    solubility: {
      summary:
        "Small ketones are quite soluble in water, but solubility decreases with increasing chain length.",
      details: [
        "The carbonyl oxygen can accept hydrogen bonds from water.",
        "Larger hydrocarbon groups reduce the overall compatibility with water.",
      ],
    },
    acidityBasicity: {
      summary:
        "Essentially neutral overall, with chemistry dominated by the polarized carbonyl group.",
      details: [
        "Ketones are electrophilic at the carbonyl carbon but are not appreciably acidic or basic in simple aqueous descriptions.",
      ],
    },
    notableProperties: [
      "Usually resist oxidation under the mild conditions that oxidize aldehydes.",
      "Can be reduced back to secondary alcohols.",
      "Many smaller ketones are good organic solvents because they mix with a wide range of substances.",
    ],
  },
  {
    id: "carboxylic-acid",
    name: "Carboxylic acid",
    nomenclature: {
      suffix: "-oic acid",
      prefix: "carboxy-",
    },
    generalFormula: "RCOOH",
    functionalGroup: "Carboxyl group, -COOH",
    representativeStructureLabel: "Representative member: ethanoic acid, CH3COOH",
    functionalGroupVisual: "-COOH",
    boilingPoint: {
      summary:
        "Usually high because carboxylic acids hydrogen bond strongly and often form dimers in the liquid phase.",
      details: [
        "Boiling point increases further as the hydrocarbon chain gets longer.",
        "They often boil above corresponding alcohols of similar size because the intermolecular attractions are especially strong.",
      ],
      representativeExample: representativeExample(
        "Ethanoic acid boils far above ethanal, even though both contain oxygen, because acid molecules strongly hydrogen bond.",
      ),
    },
    solubility: {
      summary:
        "Smaller members are quite soluble in water, but solubility falls as the hydrocarbon chain becomes longer.",
      details: [
        "The carboxyl group can hydrogen bond strongly with water.",
        "Longer hydrophobic chains increasingly dominate the behavior.",
      ],
    },
    acidityBasicity: {
      summary: "Weakly acidic because the carboxylate ion is resonance-stabilized.",
      details: [
        "They donate H+ more readily than alcohols because the conjugate base is stabilized over two oxygen atoms.",
        "They react with bases, carbonates, and many reactive metals in standard acid chemistry.",
      ],
    },
    notableProperties: [
      "Have sour or sharp odors in many small-member examples.",
      "Undergo esterification with alcohols under acidic conditions.",
      "Show both carbonyl chemistry and ordinary acid behavior.",
    ],
  },
  {
    id: "ester",
    name: "Ester",
    nomenclature: {
      suffix: "-oate",
      prefix: "alkoxycarbonyl-",
    },
    generalFormula: "RCOOR'",
    functionalGroup: "Ester linkage, -COO-",
    representativeStructureLabel: "Representative member: ethyl ethanoate, CH3COOCH2CH3",
    functionalGroupVisual: "-COO-",
    boilingPoint: {
      summary:
        "Often moderate: esters are polar but cannot hydrogen bond to themselves the way alcohols and acids can.",
      details: [
        "They usually boil above comparable alkanes but below similar alcohols and carboxylic acids.",
        "Boiling point rises as ester size increases.",
      ],
      representativeExample: representativeExample(
        "Ethyl ethanoate boils much lower than ethanoic acid because ester molecules do not form the same strong hydrogen-bonded network.",
      ),
    },
    solubility: {
      summary:
        "Smaller esters have some water solubility, but solubility decreases further as chain length increases.",
      details: [
        "The ester oxygen atoms can accept hydrogen bonds from water, but the family cannot donate them.",
        "Many esters dissolve readily in organic solvents.",
      ],
    },
    acidityBasicity: {
      summary: "Essentially neutral in simple aqueous descriptions.",
      details: [
        "The family is more notable for hydrolysis and nucleophilic acyl substitution than for acidic or basic behavior.",
      ],
    },
    notableProperties: [
      "Many small esters have distinctive fruity smells.",
      "Can be hydrolyzed back to acids and alcohols under acidic or alkaline conditions.",
      "Often used as solvents, flavorings, and fragrance molecules.",
    ],
  },
] as const satisfies readonly ChemistryNodeDefinition[];

export type ChemistryNode = ChemistryNodeDefinition;
export type ChemistryNodeId = ChemistryNode["id"];

export type ChemistryApplicability =
  | {
      kind: "general";
      summary: string;
    }
  | {
      kind: "subgroup-specific";
      summary: string;
    };

export type ChemistryEquation =
  | {
      mode: "generic-only";
      generic: string;
    }
  | {
      mode: "generic-and-representative";
      generic: string;
      representativeExample: ChemistryRepresentativeExample;
    }
  | {
      mode: "representative-only";
      representativeExample: ChemistryRepresentativeExample;
    };

export type ChemistryIonicEquation =
  | {
      applicability: "shown";
      equation: string;
    }
  | {
      applicability: "not-typically-shown";
      note: string;
    };

export type ChemistryMechanism =
  | {
      applicability: "shown";
      summary: string;
      steps?: readonly string[];
    }
  | {
      applicability: "not-typically-shown";
      note: string;
    };

type ChemistryEdgeDefinition = {
  id: string;
  from: ChemistryNodeId;
  to: ChemistryNodeId;
  label: string;
  reactionType: string;
  applicability: ChemistryApplicability;
  additionalOrganicReactants?: NonEmptyList<string>;
  reagents: NonEmptyList<ChemistryDetailItem>;
  catalysts?: NonEmptyList<ChemistryDetailItem>;
  conditions: NonEmptyList<string>;
  equation: ChemistryEquation;
  ionicEquation: ChemistryIonicEquation;
  mechanism: ChemistryMechanism;
  notes?: readonly string[];
};

export const chemistryReactionEdges = [
  {
    id: "alkene-to-alcohol-hydration",
    from: "alkene",
    to: "alcohol",
    label: "Hydration",
    reactionType: "Electrophilic addition",
    applicability: {
      kind: "general",
      summary:
        "A family-level alkene hydration route. Unsymmetrical alkenes can give major and minor products, so a representative example is safer than pretending one exact family-wide equation fits every case.",
    },
    reagents: [{ name: "Steam", formula: "H2O(g)" }],
    catalysts: [{ name: "Phosphoric acid on silica", formula: "H3PO4" }],
    conditions: ["About 300 C", "High pressure, often around 60 to 70 atm"],
    equation: {
      mode: "representative-only",
      representativeExample: representativeExample(
        "CH2=CH2(g) + H2O(g) -> CH3CH2OH(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "No separate ionic equation is usually foregrounded for this family-level hydration summary.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "The pi bond is protonated first, then water attacks the carbocation-like intermediate before deprotonation gives the alcohol.",
      steps: [
        "The alkene pi bond attacks H+ from the acid catalyst to form the more stable carbocation arrangement available.",
        "A water molecule attacks the electron-poor carbon center.",
        "Loss of a proton regenerates the catalyst and leaves the alcohol product.",
      ],
    },
    notes: [
      "Representative equation uses ethene because product placement across an unsymmetrical alkene is not captured honestly by one exact family-wide equation.",
    ],
  },
  {
    id: "alkene-to-haloalkane-hydrohalogenation",
    from: "alkene",
    to: "haloalkane",
    label: "Hydrohalogenation",
    reactionType: "Electrophilic addition",
    applicability: {
      kind: "general",
      summary:
        "A family-level addition of HX across C=C. Unsymmetrical alkenes need product-selection discussion, so a representative example is clearer than one overly specific generic equation.",
    },
    reagents: [{ name: "Hydrogen halide, e.g. HBr or HCl", formula: "HBr(g) / HCl(g)" }],
    conditions: ["Usually room temperature or gentle warming"],
    equation: {
      mode: "representative-only",
      representativeExample: representativeExample(
        "CH2=CH2(g) + HBr(g) -> CH3CH2Br(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Hydrohalogenation is usually taught here as a neutral molecular equation rather than a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "The alkene undergoes electrophilic addition: protonation creates an electron-poor intermediate, then halide attacks.",
      steps: [
        "The alkene pi bond attacks H+ from the hydrogen halide.",
        "A halide ion attacks the carbocation-like intermediate.",
        "The C=C bond is replaced by single bonds to H and X.",
      ],
    },
    notes: [
      "Different hydrogen halides lead to different haloalkanes, so the edge is a family-level map rather than a single reagent recipe.",
    ],
  },
  {
    id: "haloalkane-to-alcohol-hydrolysis",
    from: "haloalkane",
    to: "alcohol",
    label: "Hydrolysis to alcohol",
    reactionType: "Nucleophilic substitution",
    applicability: {
      kind: "general",
      summary:
        "Monohaloalkanes can hydrolyse to alcohols under aqueous hydroxide conditions. Primary examples best illustrate a simple one-step picture, but tertiary examples usually hydrolyse by a different pathway.",
    },
    reagents: [
      { name: "Aqueous sodium hydroxide", formula: "NaOH(aq)" },
      { name: "Aqueous potassium hydroxide", formula: "KOH(aq)" },
    ],
    conditions: ["Warm under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "R-X(l) + OH-(aq) -> R-OH(l) + X-(aq)",
      representativeExample: representativeExample(
        "CH3CH2Br(l) + NaOH(aq) -> CH3CH2OH(l) + NaBr(aq)",
      ),
    },
    ionicEquation: {
      applicability: "shown",
      equation: "CH3CH2Br(l) + OH-(aq) -> CH3CH2OH(l) + Br-(aq)",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "For the introductory mechanism normally shown at this level, a hydroxide ion acts as the nucleophile and replaces the halogen-bearing leaving group.",
      steps: [
        "The electron-rich OH- approaches the carbon attached to the halogen.",
        "As the new C-O bond forms, the C-X bond breaks.",
        "The product alcohol and halide ion separate.",
      ],
    },
    notes: [
      "Representative equation uses bromoethane because the whole family cannot be represented honestly by a single compound equation.",
    ],
  },
  {
    id: "alcohol-to-haloalkane-substitution",
    from: "alcohol",
    to: "haloalkane",
    label: "Substitution to haloalkane",
    reactionType: "Substitution",
    applicability: {
      kind: "general",
      summary:
        "Alcohols can be converted to haloalkanes, but the reagent set depends on which halogen is being introduced. A representative HBr route is clearer than one supposedly universal equation.",
    },
    reagents: [
      { name: "Hydrogen halide", formula: "HX(aq)" },
      { name: "Phosphorus pentachloride", formula: "PCl5" },
      { name: "Thionyl chloride", formula: "SOCl2" },
    ],
    catalysts: [{ name: "Zinc chloride when concentrated HCl is used", formula: "ZnCl2" }],
    conditions: ["Room temperature or gentle heating, depending on reagent choice"],
    equation: {
      mode: "representative-only",
      representativeExample: representativeExample(
        "CH3CH2OH(l) + HBr(aq) -> CH3CH2Br(l) + H2O(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "This substitution is usually summarized with a molecular equation because the reagent system varies by halogenation route.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "The hydroxyl group must be turned into a better leaving group before halide substitution can occur efficiently.",
      steps: [
        "The alcohol oxygen is protonated or otherwise activated by the reagent system.",
        "A halide ion or halogenating reagent replaces the activated leaving group.",
        "Water or another leaving group departs, giving the haloalkane.",
      ],
    },
    notes: [
      "Representative example uses HBr, but chlorination and iodination often use different reagent systems and by-products.",
    ],
  },
  {
    id: "alcohol-to-aldehyde-oxidation",
    from: "alcohol",
    to: "aldehyde",
    label: "Oxidation to aldehyde",
    reactionType: "Oxidation",
    applicability: {
      kind: "subgroup-specific",
      summary:
        "Primary alcohols only. Distillation is used to remove the aldehyde as it forms and reduce further oxidation.",
    },
    reagents: [{ name: "Acidified potassium dichromate(VI)", formula: "K2Cr2O7 / H+(aq)" }],
    conditions: ["Warm gently", "Distil the aldehyde as it forms"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCH2OH(l) + [O] -> RCHO(l) + H2O(l)",
      representativeExample: representativeExample(
        "CH3CH2OH(l) + [O] -> CH3CHO(l) + H2O(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Organic oxidation is usually taught with the [O] shorthand here rather than a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Organic oxidation is usually summarized as removal of hydrogen and gain of oxygen rather than a fully expanded redox mechanism.",
      steps: [
        "The oxidizing agent accepts electrons as the alcohol is converted into a carbonyl compound.",
        "Hydrogen is removed from the O-H bond and from the carbon next to oxygen.",
        "The product is isolated early to limit further oxidation to the acid.",
      ],
    },
    notes: [
      "The [O] shorthand is the standard teaching convention here; a fully expanded dichromate redox equation is usually taught separately.",
    ],
  },
  {
    id: "alcohol-to-ketone-oxidation",
    from: "alcohol",
    to: "ketone",
    label: "Oxidation to ketone",
    reactionType: "Oxidation",
    applicability: {
      kind: "subgroup-specific",
      summary: "Secondary alcohols only.",
    },
    reagents: [{ name: "Acidified potassium dichromate(VI)", formula: "K2Cr2O7 / H+(aq)" }],
    conditions: ["Heat under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCH(OH)R'(l) + [O] -> RCOR'(l) + H2O(l)",
      representativeExample: representativeExample(
        "CH3CH(OH)CH3(l) + [O] -> CH3COCH3(l) + H2O(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "This oxidation is usually represented by a neutral organic equation rather than a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Secondary alcohol oxidation removes hydrogen and forms the carbonyl group without extending to a carboxylic acid.",
      steps: [
        "The oxidizing agent converts the C-OH arrangement into C=O.",
        "Hydrogen is removed from the O-H bond and the carbon carrying the hydroxyl group.",
        "The ketone is the stable oxidation product for the secondary alcohol family.",
      ],
    },
    notes: [
      "Tertiary alcohols are not included on this edge because they do not oxidize cleanly under the same simple family rule.",
    ],
  },
  {
    id: "aldehyde-to-carboxylic-acid-oxidation",
    from: "aldehyde",
    to: "carboxylic-acid",
    label: "Oxidation to carboxylic acid",
    reactionType: "Oxidation",
    applicability: {
      kind: "general",
      summary:
        "A family-level aldehyde oxidation route. Aldehydes are readily oxidized because the carbonyl carbon is attached to at least one hydrogen.",
    },
    reagents: [
      { name: "Acidified potassium dichromate(VI)", formula: "K2Cr2O7 / H+(aq)" },
      { name: "Acidified permanganate", formula: "MnO4-(aq) / H+(aq)" },
    ],
    conditions: ["Heat under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCHO(l) + [O] -> RCOOH(l)",
      representativeExample: representativeExample(
        "CH3CHO(l) + [O] -> CH3COOH(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "This family-level oxidation is usually taught here with the [O] shorthand instead of a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Aldehydes oxidize readily because the carbonyl carbon is attached to at least one hydrogen that can be replaced during oxidation.",
      steps: [
        "The oxidizing agent converts the aldehyde into the higher oxidation-state carboxylic acid.",
        "Hydrogen removal and oxygen gain are summarized with [O] in the standard organic shorthand.",
      ],
    },
    notes: [
      "This readiness to oxidize is one reason aldehydes are often distinguished from ketones in qualitative tests.",
    ],
  },
  {
    id: "aldehyde-to-alcohol-reduction",
    from: "aldehyde",
    to: "alcohol",
    label: "Reduction to alcohol",
    reactionType: "Reduction",
    applicability: {
      kind: "general",
      summary: "Aldehydes reduce to primary alcohols.",
    },
    reagents: [{ name: "Sodium borohydride", formula: "NaBH4" }],
    conditions: ["Aqueous or alcoholic solution", "Room temperature or gentle warming"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCHO(l) + 2[H] -> RCH2OH(l)",
      representativeExample: representativeExample(
        "CH3CHO(l) + 2[H] -> CH3CH2OH(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "This reduction is usually summarized with the neutral [H] shorthand rather than a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "A hydride from the reducing agent adds to the carbonyl carbon, and protonation then gives the primary alcohol.",
      steps: [
        "A hydride is transferred from the reducing agent to the carbonyl carbon.",
        "The oxygen-bearing intermediate is protonated during work-up.",
        "The carbonyl group is converted into the corresponding primary alcohol.",
      ],
    },
    notes: [
      "Intro-organic courses often teach sodium borohydride as the standard lab reagent for this reduction.",
    ],
  },
  {
    id: "ketone-to-alcohol-reduction",
    from: "ketone",
    to: "alcohol",
    label: "Reduction to alcohol",
    reactionType: "Reduction",
    applicability: {
      kind: "general",
      summary: "Ketones reduce to secondary alcohols.",
    },
    reagents: [{ name: "Sodium borohydride", formula: "NaBH4" }],
    conditions: ["Aqueous or alcoholic solution", "Room temperature or gentle warming"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOR'(l) + 2[H] -> RCH(OH)R'(l)",
      representativeExample: representativeExample(
        "CH3COCH3(l) + 2[H] -> CH3CH(OH)CH3(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "This reduction is usually summarized with the neutral [H] shorthand rather than a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "A hydride from the reducing agent adds to the carbonyl carbon, and protonation then gives the secondary alcohol.",
      steps: [
        "A hydride is transferred from the reducing agent to the carbonyl carbon.",
        "The oxygen-bearing intermediate is protonated during work-up.",
        "The carbonyl group is converted into the corresponding secondary alcohol.",
      ],
    },
    notes: [
      "Intro-organic courses often teach sodium borohydride as the standard lab reagent for this reduction.",
    ],
  },
  {
    id: "carboxylic-acid-to-ester-esterification",
    from: "carboxylic-acid",
    to: "ester",
    label: "Esterification",
    reactionType: "Condensation / nucleophilic acyl substitution",
    applicability: {
      kind: "general",
      summary:
        "Shown as a family-level reversible process between a carboxylic acid and an alcohol. Yield improves if one reactant is in excess or water is removed.",
    },
    additionalOrganicReactants: ["Alcohol family"],
    reagents: ["Alcohol family"],
    catalysts: [{ name: "Concentrated sulfuric acid", formula: "H2SO4(l)" }],
    conditions: ["Heat under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOOH(l) + R'OH(l) <=> RCOOR'(l) + H2O(l)",
      representativeExample: representativeExample(
        "CH3COOH(l) + CH3CH2OH(l) <=> CH3COOCH2CH3(l) + H2O(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Esterification is usually taught as a reversible molecular equation rather than a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "The acid catalyst activates the carbonyl group, the alcohol attacks, and water is eliminated in a reversible acyl-substitution sequence.",
      steps: [
        "The carbonyl oxygen is protonated by the acid catalyst.",
        "The alcohol oxygen attacks the carbonyl carbon.",
        "Proton transfers occur within the intermediate.",
        "Water is eliminated and the catalyst is regenerated, leaving the ester.",
      ],
    },
    notes: [
      "The extra organic co-reactant belongs to the edge metadata because the nodes still represent whole families rather than a hypergraph.",
    ],
  },
  {
    id: "ester-to-carboxylic-acid-hydrolysis",
    from: "ester",
    to: "carboxylic-acid",
    label: "Hydrolysis to carboxylic acid",
    reactionType: "Hydrolysis",
    applicability: {
      kind: "general",
      summary:
        "This edge shows the acid-catalysed hydrolysis route because it leads directly back to the acid family. Alkaline hydrolysis is often used in practice, but it gives a carboxylate salt first and needs acidification to finish at the acid family.",
    },
    reagents: [{ name: "Water", formula: "H2O(l)" }],
    catalysts: [{ name: "Dilute acid", formula: "H+(aq)" }],
    conditions: ["Heat under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOOR'(l) + H2O(l) <=> RCOOH(l) + R'OH(l)",
      representativeExample: representativeExample(
        "CH3COOCH2CH3(l) + H2O(l) <=> CH3COOH(l) + CH3CH2OH(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Acid hydrolysis is usually framed here as a molecular equilibrium rather than a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Acid-catalyzed ester hydrolysis is the reverse of esterification and proceeds through protonation, nucleophilic attack by water, and breakdown of the tetrahedral intermediate.",
      steps: [
        "The ester carbonyl oxygen is protonated by the acid catalyst.",
        "Water attacks the carbonyl carbon.",
        "Proton transfers reorganize the tetrahedral intermediate.",
        "The alcohol leaves and the acid catalyst is regenerated.",
      ],
    },
    notes: [
      "The representative equation also produces an alcohol, but the main directed edge highlights the acid family as the primary destination for this reverse pathway.",
    ],
  },
] as const satisfies readonly ChemistryEdgeDefinition[];

export type ChemistryEdge = ChemistryEdgeDefinition;

export type ChemistryAdjacentPathway = {
  direction: "incoming" | "outgoing";
  edge: ChemistryEdge;
  neighborNode: ChemistryNode;
};

export type ChemistryDirectConversion = {
  direction: "left-to-right" | "right-to-left";
  edge: ChemistryEdge;
};

export type ChemistryRouteStep = {
  from: ChemistryNodeId;
  to: ChemistryNodeId;
  edgeId: ChemistryEdge["id"];
  isSubgroupSpecific: boolean;
  hasAdditionalOrganicReactant: boolean;
  isRepresentativeOnly: boolean;
};

export type ChemistryRoute = {
  id: string;
  nodeIds: readonly ChemistryNodeId[];
  edgeIds: readonly ChemistryEdge["id"][];
  steps: readonly ChemistryRouteStep[];
  stepCount: number;
  includesSubgroupSpecificStep: boolean;
  includesAdditionalOrganicReactant: boolean;
  includesRepresentativeOnlyStep: boolean;
};

export function getChemistryNodeById(
  nodeId: ChemistryNodeId,
  options?: {
    nodes?: readonly ChemistryNode[];
  },
): ChemistryNode {
  const node = (options?.nodes ?? chemistryReactionNodes).find((item) => item.id === nodeId);

  if (!node) {
    throw new Error(`Unknown chemistry node id "${nodeId}".`);
  }

  return node;
}

export function getChemistryIncomingEdges(
  nodeId: ChemistryNodeId,
  options?: {
    edges?: readonly ChemistryEdge[];
  },
): readonly ChemistryEdge[] {
  return (options?.edges ?? chemistryReactionEdges).filter((edge) => edge.to === nodeId);
}

export function getChemistryOutgoingEdges(
  nodeId: ChemistryNodeId,
  options?: {
    edges?: readonly ChemistryEdge[];
  },
): readonly ChemistryEdge[] {
  return (options?.edges ?? chemistryReactionEdges).filter((edge) => edge.from === nodeId);
}

export function getChemistryAdjacentPathways(
  nodeId: ChemistryNodeId,
  options?: {
    nodes?: readonly ChemistryNode[];
    edges?: readonly ChemistryEdge[];
  },
): {
  incoming: readonly ChemistryAdjacentPathway[];
  outgoing: readonly ChemistryAdjacentPathway[];
} {
  const nodes = options?.nodes ?? chemistryReactionNodes;
  const edges = options?.edges ?? chemistryReactionEdges;
  const incoming = getChemistryIncomingEdges(nodeId, { edges }).map((edge) => ({
    direction: "incoming" as const,
    edge,
    neighborNode: getChemistryNodeById(edge.from, { nodes }),
  }));
  const outgoing = getChemistryOutgoingEdges(nodeId, { edges }).map((edge) => ({
    direction: "outgoing" as const,
    edge,
    neighborNode: getChemistryNodeById(edge.to, { nodes }),
  }));

  return { incoming, outgoing };
}

export function getChemistryDirectConversionsBetween(
  leftNodeId: ChemistryNodeId,
  rightNodeId: ChemistryNodeId,
  options?: {
    edges?: readonly ChemistryEdge[];
  },
): readonly ChemistryDirectConversion[] {
  return (options?.edges ?? chemistryReactionEdges)
    .filter(
      (edge) =>
        (edge.from === leftNodeId && edge.to === rightNodeId) ||
        (edge.from === rightNodeId && edge.to === leftNodeId),
    )
    .map((edge) => ({
      direction:
        edge.from === leftNodeId && edge.to === rightNodeId
          ? "left-to-right"
          : "right-to-left",
      edge,
    }));
}

function buildChemistryRoute(traversedEdges: readonly ChemistryEdge[]): ChemistryRoute {
  const nodeIds = [
    traversedEdges[0].from,
    ...traversedEdges.map((edge) => edge.to),
  ] as const;
  const steps = traversedEdges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    edgeId: edge.id,
    isSubgroupSpecific: edge.applicability.kind === "subgroup-specific",
    hasAdditionalOrganicReactant:
      "additionalOrganicReactants" in edge && Boolean(edge.additionalOrganicReactants?.length),
    isRepresentativeOnly: edge.equation.mode === "representative-only",
  }));

  return {
    id: traversedEdges.map((edge) => edge.id).join(">>"),
    nodeIds,
    edgeIds: traversedEdges.map((edge) => edge.id),
    steps,
    stepCount: traversedEdges.length,
    includesSubgroupSpecificStep: steps.some((step) => step.isSubgroupSpecific),
    includesAdditionalOrganicReactant: steps.some((step) => step.hasAdditionalOrganicReactant),
    includesRepresentativeOnlyStep: steps.some((step) => step.isRepresentativeOnly),
  };
}

type ChemistryRouteSearchOptions = {
  edges?: readonly ChemistryEdge[];
  maxEdges?: number;
  maxRoutes?: number;
};

export function getChemistryRoutesBetween(
  startNodeId: ChemistryNodeId,
  targetNodeId: ChemistryNodeId,
  options?: ChemistryRouteSearchOptions,
): readonly ChemistryRoute[] {
  const edges = options?.edges ?? chemistryReactionEdges;
  const maxEdges = options?.maxEdges ?? 3;
  const maxRoutes = options?.maxRoutes ?? 5;

  if (startNodeId === targetNodeId) {
    return [];
  }

  const outgoingEdgesByNode = new Map<ChemistryNodeId, ChemistryEdge[]>();
  for (const edge of edges) {
    const current = outgoingEdgesByNode.get(edge.from) ?? [];
    current.push(edge);
    outgoingEdgesByNode.set(edge.from, current);
  }

  const routes: ChemistryRoute[] = [];
  const queue: Array<{
    nodeIds: ChemistryNodeId[];
    traversedEdges: ChemistryEdge[];
  }> = [{ nodeIds: [startNodeId], traversedEdges: [] }];

  while (queue.length && routes.length < maxRoutes) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current.traversedEdges.length >= maxEdges) {
      continue;
    }

    const currentNodeId = current.nodeIds[current.nodeIds.length - 1];
    const outgoingEdges = outgoingEdgesByNode.get(currentNodeId) ?? [];

    for (const edge of outgoingEdges) {
      if (current.nodeIds.includes(edge.to)) {
        continue;
      }

      const nextTraversedEdges = [...current.traversedEdges, edge];
      const nextNodeIds = [...current.nodeIds, edge.to];

      if (edge.to === targetNodeId) {
        routes.push(buildChemistryRoute(nextTraversedEdges));
      } else {
        queue.push({
          nodeIds: nextNodeIds,
          traversedEdges: nextTraversedEdges,
        });
      }

      if (routes.length >= maxRoutes) {
        break;
      }
    }
  }

  return routes
    .sort((left, right) => {
      if (left.stepCount !== right.stepCount) {
        return left.stepCount - right.stepCount;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, maxRoutes);
}

export type ChemistryGraphLayout = {
  width: number;
  height: number;
  nodePositions: Record<ChemistryNodeId, { x: number; y: number }>;
  edgeCurves: Record<ChemistryEdge["id"], number>;
  edgeLabelOffsets: Partial<Record<ChemistryEdge["id"], { x: number; y: number }>>;
};

type ChemistryNodeLocaleOverlay = Pick<
  ChemistryNodeDefinition,
  | "name"
  | "functionalGroup"
  | "representativeStructureLabel"
  | "boilingPoint"
  | "solubility"
  | "acidityBasicity"
  | "notableProperties"
> & {
  nomenclature?: Partial<ChemistryNomenclature>;
};

type ChemistryEdgeLocaleOverlay = Pick<
  ChemistryEdgeDefinition,
  | "label"
  | "reactionType"
  | "applicability"
  | "reagents"
  | "conditions"
  | "ionicEquation"
  | "mechanism"
> & {
  catalysts?: ChemistryEdgeDefinition["catalysts"];
  additionalOrganicReactants?: ChemistryEdgeDefinition["additionalOrganicReactants"];
  notes?: ChemistryEdgeDefinition["notes"];
};

type ChemistryLocaleOverlay = {
  nodes: Record<ChemistryNodeId, ChemistryNodeLocaleOverlay>;
  edges: Record<ChemistryEdge["id"], ChemistryEdgeLocaleOverlay>;
};

const chemistryLocaleOverlays = chemistryReactionLocaleOverlays satisfies Partial<
  Record<AppLocale, ChemistryLocaleOverlay>
>;

function getChemistryLocaleOverlay(locale: AppLocale | string) {
  if (locale === "zh-HK") {
    return chemistryLocaleOverlays["zh-HK"];
  }

  return undefined;
}

export function getChemistryReactionNodesForLocale(
  locale: AppLocale | string,
): readonly ChemistryNode[] {
  const overlay = getChemistryLocaleOverlay(locale)?.nodes;
  if (!overlay) {
    return chemistryReactionNodes;
  }

  return chemistryReactionNodes.map((node) => {
    const localizedNode = overlay[node.id];
    if (!localizedNode) {
      return node;
    }

    return {
      ...node,
      ...localizedNode,
      nomenclature: "nomenclature" in localizedNode && localizedNode.nomenclature
        ? { ...node.nomenclature, ...localizedNode.nomenclature }
        : node.nomenclature,
    };
  });
}

export function getChemistryReactionEdgesForLocale(
  locale: AppLocale | string,
): readonly ChemistryEdge[] {
  const overlay = getChemistryLocaleOverlay(locale)?.edges;
  if (!overlay) {
    return chemistryReactionEdges;
  }

  return chemistryReactionEdges.map((edge) => {
    const localizedEdge = overlay[edge.id];
    return localizedEdge ? { ...edge, ...localizedEdge } : edge;
  });
}

export function getChemistryReactionMindMapContent(locale: AppLocale | string) {
  return {
    nodes: getChemistryReactionNodesForLocale(locale),
    edges: getChemistryReactionEdgesForLocale(locale),
  };
}

export const chemistryReactionGraphLayout: ChemistryGraphLayout = {
  width: 1180,
  height: 660,
  nodePositions: {
    alkene: { x: 70, y: 110 },
    haloalkane: { x: 70, y: 450 },
    alcohol: { x: 410, y: 280 },
    aldehyde: { x: 760, y: 92 },
    ketone: { x: 760, y: 450 },
    "carboxylic-acid": { x: 1000, y: 86 },
    ester: { x: 1000, y: 450 },
  },
  edgeCurves: {
    "alkene-to-alcohol-hydration": -70,
    "alkene-to-haloalkane-hydrohalogenation": 92,
    "haloalkane-to-alcohol-hydrolysis": -62,
    "alcohol-to-haloalkane-substitution": 62,
    "alcohol-to-aldehyde-oxidation": -62,
    "alcohol-to-ketone-oxidation": 62,
    "aldehyde-to-carboxylic-acid-oxidation": -24,
    "aldehyde-to-alcohol-reduction": 58,
    "ketone-to-alcohol-reduction": -58,
    "carboxylic-acid-to-ester-esterification": 72,
    "ester-to-carboxylic-acid-hydrolysis": -72,
  },
  edgeLabelOffsets: {
    "alkene-to-alcohol-hydration": { x: -14, y: -36 },
    "alkene-to-haloalkane-hydrohalogenation": { x: -28, y: 32 },
    "haloalkane-to-alcohol-hydrolysis": { x: -44, y: -26 },
    "alcohol-to-haloalkane-substitution": { x: 44, y: 26 },
    "alcohol-to-aldehyde-oxidation": { x: 18, y: -44 },
    "aldehyde-to-alcohol-reduction": { x: -18, y: 44 },
    "alcohol-to-ketone-oxidation": { x: 18, y: 44 },
    "ketone-to-alcohol-reduction": { x: -18, y: -44 },
    "aldehyde-to-carboxylic-acid-oxidation": { x: 0, y: -30 },
    "carboxylic-acid-to-ester-esterification": { x: 16, y: -30 },
    "ester-to-carboxylic-acid-hydrolysis": { x: -16, y: 30 },
  },
};
