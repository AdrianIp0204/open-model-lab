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
    id: "alkane",
    name: "Alkane",
    nomenclature: {
      suffix: "-ane",
      prefix: "alkyl-",
    },
    generalFormula: "CnH2n+2",
    functionalGroup: "Saturated C-C and C-H single bonds",
    representativeStructureLabel: "Representative member: ethane, CH3CH3",
    functionalGroupVisual: "C-C",
    boilingPoint: {
      summary:
        "Usually low for smaller members because alkanes are non-polar and rely on London forces.",
      details: [
        "Boiling point rises with chain length because larger electron clouds are more polarizable.",
        "Branching usually lowers boiling point compared with a straight-chain isomer.",
      ],
      representativeExample: representativeExample(
        "Ethane boils far below room temperature, while longer liquid alkanes boil much higher.",
      ),
    },
    solubility: {
      summary: "Insoluble in water but soluble in non-polar organic solvents.",
      details: [
        "Alkanes cannot form strong interactions with water.",
        "Their hydrocarbon chains mix much better with other non-polar substances.",
      ],
    },
    acidityBasicity: {
      summary: "Essentially neutral in ordinary organic chemistry descriptions.",
      details: [
        "Their main reactions come from combustion, cracking, and radical substitution rather than acid-base behavior.",
      ],
    },
    notableProperties: [
      "Relatively unreactive compared with functional-group families.",
      "Can undergo free-radical substitution with halogens under UV light.",
      "Can be cracked into smaller alkanes and alkenes in petroleum processing.",
    ],
  },
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
    id: "nitrile",
    name: "Nitrile",
    nomenclature: {
      suffix: "-nitrile",
      prefix: "cyano-",
    },
    generalFormula: "R-CN",
    functionalGroup: "Cyano group, -C=N",
    representativeStructureLabel: "Representative member: ethanenitrile, CH3CN",
    functionalGroupVisual: "-CN",
    boilingPoint: {
      summary:
        "Often higher than comparable hydrocarbons because the nitrile group is strongly polar.",
      details: [
        "Nitriles cannot donate hydrogen bonds to each other, but the C=N bond creates strong dipole attractions.",
        "Boiling point still rises with carbon chain length.",
      ],
    },
    solubility: {
      summary:
        "Small nitriles can mix with water, but solubility drops as the hydrocarbon chain grows.",
      details: [
        "The nitrogen can accept hydrogen bonds from water.",
        "Longer non-polar chains reduce water compatibility.",
      ],
    },
    acidityBasicity: {
      summary: "Usually treated as essentially neutral in introductory family maps.",
      details: [
        "The nitrogen lone pair is held in a strongly electronegative, linear group, so nitriles are much weaker bases than amines.",
      ],
    },
    notableProperties: [
      "Useful for lengthening a carbon chain by one carbon through cyanide substitution.",
      "Can be hydrolyzed to carboxylic acids under acidic or alkaline conditions.",
      "Can be reduced to primary amines.",
    ],
  },
  {
    id: "amine",
    name: "Amine",
    nomenclature: {
      suffix: "-amine",
      prefix: "amino-",
    },
    generalFormula: "R-NH2",
    functionalGroup: "Amino group, -NH2",
    representativeStructureLabel: "Representative member: ethylamine, CH3CH2NH2",
    functionalGroupVisual: "-NH2",
    boilingPoint: {
      summary:
        "Usually higher than similar alkanes because smaller primary amines can hydrogen bond, but often lower than comparable alcohols.",
      details: [
        "Nitrogen is less electronegative than oxygen, so N-H hydrogen bonding is usually weaker than O-H hydrogen bonding.",
        "Boiling point rises with carbon chain length.",
      ],
    },
    solubility: {
      summary:
        "Small amines are soluble in water, while longer-chain amines become less water-soluble.",
      details: [
        "Amines can accept hydrogen bonds from water and primary amines can also donate N-H hydrogen bonds.",
        "Their basicity also helps them form water-soluble ammonium salts with acids.",
      ],
    },
    acidityBasicity: {
      summary: "Weakly basic because the nitrogen lone pair can accept H+.",
      details: [
        "Amines form substituted ammonium ions when protonated by acids.",
        "Basicity varies with structure and solvent, so this map keeps the statement family-level.",
      ],
    },
    notableProperties: [
      "Often recognized by basic behavior and amine-like odors in small volatile examples.",
      "Can be made by reducing nitriles or by substituting haloalkanes with ammonia.",
      "Primary amines are useful stepping stones to amides and other nitrogen-containing derivatives.",
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
    id: "hydroxynitrile",
    name: "Hydroxynitrile",
    nomenclature: {
      prefix: "hydroxycyano-",
    },
    generalFormula: "RCH(OH)CN or R2C(OH)CN",
    functionalGroup: "Hydroxyl and nitrile groups on the same carbon skeleton",
    representativeStructureLabel: "Representative product: 2-hydroxypropanenitrile, CH3CH(OH)CN",
    functionalGroupVisual: "-OH + -CN",
    boilingPoint: {
      summary:
        "Often higher than the parent carbonyl compound because hydroxynitriles can hydrogen bond and remain polar.",
      details: [
        "Exact boiling points vary strongly with structure, so the map keeps this as a trend rather than a universal value.",
      ],
    },
    solubility: {
      summary:
        "Small hydroxynitriles can interact with water through the hydroxyl and nitrile groups, but carbon-chain size still matters.",
      details: [
        "The -OH group can hydrogen bond with water.",
        "The nitrile group is polar and can accept hydrogen bonds.",
      ],
    },
    acidityBasicity: {
      summary: "Usually treated as largely neutral in this family-level map.",
      details: [
        "The hydroxyl group can be weakly acidic only under strong-base conditions, and the nitrile is a weak base at most.",
      ],
    },
    notableProperties: [
      "Formed by nucleophilic addition of HCN to aldehydes or ketones.",
      "Often used to illustrate carbon-carbon bond formation from carbonyl compounds.",
      "Contains both alcohol and nitrile functionality, so follow-up chemistry depends on the intended route.",
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
    id: "carboxylate-salt",
    name: "Carboxylate salt",
    nomenclature: {
      suffix: "-oate salt",
      prefix: "carboxylato-",
    },
    generalFormula: "RCOO- M+",
    functionalGroup: "Carboxylate ion, -COO-",
    representativeStructureLabel: "Representative member: sodium ethanoate, CH3COO- Na+",
    functionalGroupVisual: "-COO-",
    boilingPoint: {
      summary:
        "Ionic salts usually have high melting points rather than simple low boiling points.",
      details: [
        "The ionic lattice gives much stronger attractions than neutral organic molecules of similar size.",
      ],
    },
    solubility: {
      summary:
        "Many small sodium and potassium carboxylates are water-soluble because they are ionic.",
      details: [
        "Solubility can decrease for very long hydrocarbon chains even when the carboxylate head is ionic.",
      ],
    },
    acidityBasicity: {
      summary:
        "Carboxylate ions are weak bases and are the conjugate bases of carboxylic acids.",
      details: [
        "Acidification converts a carboxylate salt back into the corresponding carboxylic acid.",
      ],
    },
    notableProperties: [
      "Produced when carboxylic acids react with alkalis or carbonates.",
      "Produced directly by alkaline ester hydrolysis before acid work-up.",
      "Soap molecules are long-chain carboxylate salts, though this map only shows the family-level relationship.",
    ],
  },
  {
    id: "acyl-chloride",
    name: "Acyl chloride",
    nomenclature: {
      suffix: "-oyl chloride",
      prefix: "chlorocarbonyl-",
    },
    generalFormula: "RCOCl",
    functionalGroup: "Acyl chloride group, -COCl",
    representativeStructureLabel: "Representative member: ethanoyl chloride, CH3COCl",
    functionalGroupVisual: "-COCl",
    boilingPoint: {
      summary:
        "Often moderate for small members, with polarity raising boiling point compared with similar hydrocarbons.",
      details: [
        "They do not hydrogen bond to themselves in the way alcohols or acids do.",
        "Many low-mass acyl chlorides are volatile and moisture-sensitive.",
      ],
    },
    solubility: {
      summary:
        "Not described by ordinary water solubility because acyl chlorides react rapidly with water.",
      details: [
        "Hydrolysis gives the carboxylic acid and hydrogen chloride.",
      ],
    },
    acidityBasicity: {
      summary: "Not treated as an acid/base family here; the key behavior is high acyl-transfer reactivity.",
      details: [
        "The carbonyl carbon is strongly electrophilic and chloride is a good leaving group.",
      ],
    },
    notableProperties: [
      "Very reactive carboxylic acid derivative.",
      "Can make esters from alcohols without the equilibrium limitation of Fischer esterification.",
      "Can form amides with ammonia or amines.",
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
  {
    id: "amide",
    name: "Amide",
    nomenclature: {
      suffix: "-amide",
      prefix: "carbamoyl-",
    },
    generalFormula: "RCONH2",
    functionalGroup: "Amide group, -CONH2",
    representativeStructureLabel: "Representative member: ethanamide, CH3CONH2",
    functionalGroupVisual: "-CONH2",
    boilingPoint: {
      summary:
        "Often high for small primary amides because the amide group is very polar and can hydrogen bond strongly.",
      details: [
        "Hydrogen bonding and resonance in the amide group make amides less volatile than many similar carbonyl compounds.",
      ],
    },
    solubility: {
      summary:
        "Small amides are often water-soluble, but solubility falls as hydrocarbon size increases.",
      details: [
        "Primary amides can donate and accept hydrogen bonds with water.",
      ],
    },
    acidityBasicity: {
      summary:
        "Much less basic than amines because the nitrogen lone pair is delocalized into the carbonyl group.",
      details: [
        "The amide group is strongly resonance-stabilized, which changes its behavior compared with ordinary amines.",
      ],
    },
    notableProperties: [
      "Can be prepared from acyl chlorides and ammonia or amines.",
      "Shows a stable carbonyl-nitrogen linkage that appears in proteins and many materials.",
      "Hydrolysis is possible, but usually needs stronger conditions than ester hydrolysis.",
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
    id: "alkane-to-haloalkane-radical-substitution",
    from: "alkane",
    to: "haloalkane",
    label: "Radical substitution",
    reactionType: "Free-radical substitution",
    applicability: {
      kind: "general",
      summary:
        "Alkanes can form haloalkanes when a C-H bond is substituted by a halogen under radical conditions. Product mixtures are common for larger or branched alkanes, so this remains a family-level route.",
    },
    reagents: [{ name: "Chlorine or bromine", formula: "Cl2(g) / Br2(l)" }],
    conditions: ["UV light"],
    equation: {
      mode: "representative-only",
      representativeExample: representativeExample(
        "CH4(g) + Cl2(g) -> CH3Cl(g) + HCl(g)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Radical substitution is not usually represented with a separate ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "UV light starts a radical chain reaction with initiation, propagation, and termination steps.",
      steps: [
        "UV light splits halogen molecules into radicals.",
        "A halogen radical abstracts H from the alkane to form an alkyl radical.",
        "The alkyl radical reacts with halogen to form the haloalkane and regenerate a halogen radical.",
      ],
    },
    notes: [
      "The map keeps this as a route to haloalkanes, not a promise of a single clean product for every alkane.",
    ],
  },
  {
    id: "alkane-to-alkene-cracking",
    from: "alkane",
    to: "alkene",
    label: "Cracking",
    reactionType: "Thermal or catalytic cracking",
    applicability: {
      kind: "subgroup-specific",
      summary:
        "Most useful for larger alkanes. Cracking gives a mixture of smaller alkanes and alkenes rather than one exact family-wide product.",
    },
    reagents: ["Longer-chain alkane feedstock"],
    catalysts: [{ name: "Zeolite or alumina catalyst", formula: "Al2O3 / SiO2" }],
    conditions: ["High temperature", "Catalytic cracking uses a hot catalyst surface"],
    equation: {
      mode: "representative-only",
      representativeExample: representativeExample(
        "C6H14(g) -> C2H4(g) + C4H10(g)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Cracking is not usually summarized with an ionic equation in this family map.",
    },
    mechanism: {
      applicability: "not-typically-shown",
      note:
        "Introductory maps usually treat cracking as a feedstock conversion rather than drawing every radical or carbocation step.",
    },
    notes: [
      "This route adds feedstock context without turning the map into a full petrochemistry flow sheet.",
    ],
  },
  {
    id: "alkene-to-alkane-hydrogenation",
    from: "alkene",
    to: "alkane",
    label: "Hydrogenation",
    reactionType: "Catalytic addition",
    applicability: {
      kind: "general",
      summary:
        "Hydrogen adds across the C=C bond to make the corresponding saturated alkane family.",
    },
    reagents: [{ name: "Hydrogen", formula: "H2(g)" }],
    catalysts: [{ name: "Nickel catalyst", formula: "Ni" }],
    conditions: ["Heat gently with catalyst"],
    equation: {
      mode: "generic-and-representative",
      generic: "CnH2n + H2 -> CnH2n+2",
      representativeExample: representativeExample(
        "CH2=CH2(g) + H2(g) -> CH3CH3(g)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Hydrogenation is usually shown as catalytic addition, not as a separate ionic equation.",
    },
    mechanism: {
      applicability: "not-typically-shown",
      note:
        "A surface-catalyzed mechanism exists, but this map keeps the visible route at the family-conversion level.",
    },
  },
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
    id: "haloalkane-to-nitrile-cyanide-substitution",
    from: "haloalkane",
    to: "nitrile",
    label: "Substitution to nitrile",
    reactionType: "Nucleophilic substitution",
    applicability: {
      kind: "general",
      summary:
        "Haloalkanes can undergo cyanide substitution to give nitriles, extending the carbon chain by one carbon.",
    },
    reagents: [{ name: "Potassium cyanide in ethanol", formula: "KCN(ethanol)" }],
    conditions: ["Heat under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "R-X(l) + CN-(alc) -> R-CN(l) + X-(alc)",
      representativeExample: representativeExample(
        "CH3CH2Br(l) + KCN(ethanol) -> CH3CH2CN(l) + KBr(ethanol)",
      ),
    },
    ionicEquation: {
      applicability: "shown",
      equation: "R-X + CN- -> R-CN + X-",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Cyanide acts as the nucleophile and replaces the halogen-bearing leaving group.",
      steps: [
        "The carbon end of CN- attacks the carbon attached to the halogen.",
        "The C-X bond breaks as the C-CN bond forms.",
        "A nitrile is formed with one more carbon than the original haloalkane chain.",
      ],
    },
  },
  {
    id: "haloalkane-to-amine-ammonia-substitution",
    from: "haloalkane",
    to: "amine",
    label: "Substitution to amine",
    reactionType: "Nucleophilic substitution",
    applicability: {
      kind: "general",
      summary:
        "Haloalkanes can react with ammonia to form primary amines, although further substitution can occur unless ammonia is in excess.",
    },
    reagents: [{ name: "Excess ammonia in ethanol", formula: "NH3(ethanol)" }],
    conditions: ["Heat in a sealed tube or under pressure"],
    equation: {
      mode: "representative-only",
      representativeExample: representativeExample(
        "CH3CH2Br(l) + 2NH3(ethanol) -> CH3CH2NH2(l) + NH4Br(ethanol)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "The family-level route is usually summarized with a molecular equation because ammonia also neutralizes the acid by-product.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Ammonia attacks as a nucleophile, then deprotonation gives the neutral amine.",
      steps: [
        "NH3 attacks the carbon attached to the halogen.",
        "The C-X bond breaks to release halide.",
        "A second ammonia molecule removes H+ to give the primary amine.",
      ],
    },
    notes: [
      "Excess ammonia helps limit further substitution to secondary or tertiary amines.",
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
    id: "aldehyde-to-hydroxynitrile-cyanohydrin-addition",
    from: "aldehyde",
    to: "hydroxynitrile",
    label: "Addition",
    reactionType: "Nucleophilic addition",
    applicability: {
      kind: "general",
      summary:
        "Aldehydes can add HCN across the carbonyl group to form hydroxynitriles, often called cyanohydrins.",
    },
    reagents: [
      { name: "Hydrogen cyanide", formula: "HCN" },
      { name: "Trace cyanide catalyst", formula: "KCN / H+" },
    ],
    conditions: ["Controlled pH", "Room temperature or gentle cooling"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCHO + HCN -> RCH(OH)CN",
      representativeExample: representativeExample(
        "CH3CHO(l) + HCN(aq) -> CH3CH(OH)CN(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "The map emphasizes the nucleophilic addition route rather than a separate net ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "CN- attacks the carbonyl carbon, then protonation gives the hydroxynitrile.",
      steps: [
        "CN- attacks the electron-poor carbonyl carbon.",
        "The C=O pi electrons move onto oxygen to form an alkoxide.",
        "The alkoxide is protonated to give the hydroxynitrile.",
      ],
    },
    notes: [
      "This is a useful carbon-carbon bond-forming route, but HCN handling is a significant safety issue outside the scope of the map.",
    ],
  },
  {
    id: "ketone-to-hydroxynitrile-cyanohydrin-addition",
    from: "ketone",
    to: "hydroxynitrile",
    label: "Addition",
    reactionType: "Nucleophilic addition",
    applicability: {
      kind: "general",
      summary:
        "Ketones can add HCN to form hydroxynitriles, although steric effects can make some ketones react more slowly than aldehydes.",
    },
    reagents: [
      { name: "Hydrogen cyanide", formula: "HCN" },
      { name: "Trace cyanide catalyst", formula: "KCN / H+" },
    ],
    conditions: ["Controlled pH", "Room temperature or gentle cooling"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOR' + HCN -> R-C(OH)(CN)-R'",
      representativeExample: representativeExample(
        "CH3COCH3(l) + HCN(aq) -> (CH3)2C(OH)CN(l)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "The route is usually taught as nucleophilic addition rather than as a separate net ionic equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "CN- attacks the polarized carbonyl carbon, and protonation gives the hydroxynitrile.",
      steps: [
        "CN- attacks the ketone carbonyl carbon.",
        "The carbonyl oxygen becomes an alkoxide.",
        "Protonation gives the hydroxynitrile product.",
      ],
    },
  },
  {
    id: "nitrile-to-carboxylic-acid-hydrolysis",
    from: "nitrile",
    to: "carboxylic-acid",
    label: "Hydrolysis",
    reactionType: "Hydrolysis",
    applicability: {
      kind: "general",
      summary:
        "Nitriles can be hydrolyzed to carboxylic acids under acidic conditions or through alkaline hydrolysis followed by acidification.",
    },
    reagents: [
      { name: "Dilute acid and water", formula: "H+(aq) / H2O(l)" },
      { name: "Or aqueous hydroxide then acid work-up", formula: "OH-(aq), then H+" },
    ],
    conditions: ["Heat under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "R-CN + 2H2O + H+ -> RCOOH + NH4+",
      representativeExample: representativeExample(
        "CH3CN(l) + 2H2O(l) + H+(aq) -> CH3COOH(aq) + NH4+(aq)",
      ),
    },
    ionicEquation: {
      applicability: "shown",
      equation: "R-CN + 2H2O + H+ -> RCOOH + NH4+",
    },
    mechanism: {
      applicability: "not-typically-shown",
      note:
        "The detailed hydrolysis sequence is normally beyond a compact family map; the important route is nitrile to acid.",
    },
  },
  {
    id: "nitrile-to-amine-reduction",
    from: "nitrile",
    to: "amine",
    label: "Reduction",
    reactionType: "Reduction",
    applicability: {
      kind: "general",
      summary:
        "Nitriles can be reduced to primary amines, keeping the carbon from the nitrile group as part of the chain.",
    },
    reagents: [
      { name: "Lithium aluminium hydride", formula: "LiAlH4" },
      { name: "Or hydrogen with nickel", formula: "H2 / Ni" },
    ],
    conditions: ["Dry ether then water work-up for LiAlH4", "Or catalytic hydrogenation conditions"],
    equation: {
      mode: "generic-and-representative",
      generic: "R-CN + 4[H] -> RCH2NH2",
      representativeExample: representativeExample(
        "CH3CN + 4[H] -> CH3CH2NH2",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "Introductory organic maps usually show this with the neutral [H] reduction shorthand.",
    },
    mechanism: {
      applicability: "not-typically-shown",
      note:
        "Hydride and protonation steps are useful at advanced level, but the compact map only needs the family conversion.",
    },
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
    id: "carboxylic-acid-to-carboxylate-salt-neutralisation",
    from: "carboxylic-acid",
    to: "carboxylate-salt",
    label: "Neutralisation",
    reactionType: "Acid-base reaction",
    applicability: {
      kind: "general",
      summary:
        "Carboxylic acids react with alkalis to form carboxylate salts and water.",
    },
    reagents: [
      { name: "Aqueous sodium hydroxide", formula: "NaOH(aq)" },
      { name: "Or sodium carbonate", formula: "Na2CO3(aq)" },
    ],
    conditions: ["Room temperature or gentle warming"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOOH(aq) + NaOH(aq) -> RCOONa(aq) + H2O(l)",
      representativeExample: representativeExample(
        "CH3COOH(aq) + NaOH(aq) -> CH3COONa(aq) + H2O(l)",
      ),
    },
    ionicEquation: {
      applicability: "shown",
      equation: "RCOOH(aq) + OH-(aq) -> RCOO-(aq) + H2O(l)",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Hydroxide removes the acidic proton from the carboxyl group to form the resonance-stabilized carboxylate ion.",
      steps: [
        "OH- accepts H+ from the carboxylic acid.",
        "The carboxylate ion remains paired with the metal cation in solution or solid salt form.",
      ],
    },
  },
  {
    id: "carboxylic-acid-to-acyl-chloride-chlorination",
    from: "carboxylic-acid",
    to: "acyl-chloride",
    label: "Chlorination",
    reactionType: "Conversion to acid chloride",
    applicability: {
      kind: "general",
      summary:
        "Carboxylic acids can be converted into more reactive acyl chlorides with chlorinating reagents.",
    },
    reagents: [
      { name: "Thionyl chloride", formula: "SOCl2" },
      { name: "Or phosphorus pentachloride", formula: "PCl5" },
    ],
    conditions: ["Dry conditions", "Gentle warming if needed"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOOH + SOCl2 -> RCOCl + SO2 + HCl",
      representativeExample: representativeExample(
        "CH3COOH(l) + SOCl2(l) -> CH3COCl(l) + SO2(g) + HCl(g)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "This conversion is usually taught as a molecular reagent transformation rather than a net ionic equation.",
    },
    mechanism: {
      applicability: "not-typically-shown",
      note:
        "The full reagent-specific mechanism is too detailed for the map; the important point is formation of a reactive acyl chloride.",
    },
  },
  {
    id: "acyl-chloride-to-ester-alcoholysis",
    from: "acyl-chloride",
    to: "ester",
    label: "Alcoholysis",
    reactionType: "Nucleophilic acyl substitution",
    applicability: {
      kind: "general",
      summary:
        "Acyl chlorides react readily with alcohols to form esters and hydrogen chloride.",
    },
    additionalOrganicReactants: ["Alcohol family"],
    reagents: ["Alcohol family"],
    conditions: ["Room temperature", "Dry conditions are commonly used"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOCl(l) + R'OH(l) -> RCOOR'(l) + HCl(g)",
      representativeExample: representativeExample(
        "CH3COCl(l) + CH3CH2OH(l) -> CH3COOCH2CH3(l) + HCl(g)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "The reaction is usually summarized with a molecular acyl-substitution equation.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "The alcohol oxygen attacks the acyl chloride carbonyl carbon, then chloride leaves and deprotonation gives the ester.",
      steps: [
        "Alcohol attacks the electrophilic carbonyl carbon.",
        "A tetrahedral intermediate forms and collapses as chloride leaves.",
        "Loss of H+ gives the neutral ester product.",
      ],
    },
  },
  {
    id: "acyl-chloride-to-amide-ammonolysis",
    from: "acyl-chloride",
    to: "amide",
    label: "Amidation",
    reactionType: "Nucleophilic acyl substitution",
    applicability: {
      kind: "general",
      summary:
        "Acyl chlorides react with ammonia or amines to form amides.",
    },
    reagents: [
      { name: "Ammonia", formula: "NH3" },
      { name: "Or a primary amine", formula: "RNH2" },
    ],
    conditions: ["Room temperature", "Often dry conditions"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOCl(l) + 2NH3 -> RCONH2 + NH4Cl",
      representativeExample: representativeExample(
        "CH3COCl(l) + 2NH3(g) -> CH3CONH2(s) + NH4Cl(s)",
      ),
    },
    ionicEquation: {
      applicability: "not-typically-shown",
      note:
        "This is usually taught as molecular acyl substitution with ammonia neutralizing HCl.",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Ammonia attacks the carbonyl carbon, chloride leaves, and deprotonation gives the amide.",
      steps: [
        "NH3 attacks the acyl chloride carbonyl carbon.",
        "The tetrahedral intermediate collapses as chloride leaves.",
        "Another NH3 molecule removes H+ to form the amide and ammonium chloride.",
      ],
    },
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
  {
    id: "ester-to-carboxylate-salt-alkaline-hydrolysis",
    from: "ester",
    to: "carboxylate-salt",
    label: "Saponification",
    reactionType: "Base hydrolysis / saponification",
    applicability: {
      kind: "general",
      summary:
        "Alkaline ester hydrolysis gives a carboxylate salt and an alcohol. Acidification would then convert the salt to the carboxylic acid.",
    },
    reagents: [{ name: "Aqueous sodium hydroxide", formula: "NaOH(aq)" }],
    conditions: ["Heat under reflux"],
    equation: {
      mode: "generic-and-representative",
      generic: "RCOOR'(l) + OH-(aq) -> RCOO-(aq) + R'OH(l)",
      representativeExample: representativeExample(
        "CH3COOCH2CH3(l) + NaOH(aq) -> CH3COONa(aq) + CH3CH2OH(l)",
      ),
    },
    ionicEquation: {
      applicability: "shown",
      equation: "RCOOR' + OH- -> RCOO- + R'OH",
    },
    mechanism: {
      applicability: "shown",
      summary:
        "Hydroxide attacks the ester carbonyl, then the tetrahedral intermediate collapses and the acid product is deprotonated to carboxylate.",
      steps: [
        "OH- attacks the ester carbonyl carbon.",
        "The intermediate collapses and alkoxide leaves.",
        "Acid-base transfer gives the carboxylate salt and alcohol.",
      ],
    },
    notes: [
      "This route is shown separately from acid hydrolysis because the immediate product family is a salt rather than the neutral acid.",
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
  const maxEdges = options?.maxEdges ?? 4;
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

type ChemistryNodeLocaleOverlay = Partial<Pick<
  ChemistryNodeDefinition,
  | "name"
  | "functionalGroup"
  | "representativeStructureLabel"
  | "boilingPoint"
  | "solubility"
  | "acidityBasicity"
  | "notableProperties"
>> & {
  nomenclature?: Partial<ChemistryNomenclature>;
};

type ChemistryEdgeLocaleOverlay = Partial<Pick<
  ChemistryEdgeDefinition,
  | "label"
  | "reactionType"
  | "applicability"
  | "reagents"
  | "conditions"
  | "ionicEquation"
  | "mechanism"
>> & {
  catalysts?: ChemistryEdgeDefinition["catalysts"];
  additionalOrganicReactants?: ChemistryEdgeDefinition["additionalOrganicReactants"];
  notes?: ChemistryEdgeDefinition["notes"];
};

type ChemistryLocaleOverlay = {
  nodes: Partial<Record<ChemistryNodeId, ChemistryNodeLocaleOverlay>>;
  edges: Partial<Record<ChemistryEdge["id"], ChemistryEdgeLocaleOverlay>>;
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
  width: 2000,
  height: 900,
  nodePositions: {
    alkane: { x: 60, y: 360 },
    alkene: { x: 330, y: 96 },
    haloalkane: { x: 330, y: 608 },
    alcohol: { x: 640, y: 350 },
    nitrile: { x: 640, y: 704 },
    amine: { x: 970, y: 704 },
    aldehyde: { x: 1220, y: 96 },
    ketone: { x: 1220, y: 520 },
    "carboxylic-acid": { x: 1510, y: 96 },
    ester: { x: 1510, y: 520 },
    hydroxynitrile: { x: 1510, y: 704 },
    "acyl-chloride": { x: 1740, y: 96 },
    amide: { x: 1740, y: 324 },
    "carboxylate-salt": { x: 1740, y: 718 },
  },
  edgeCurves: {
    "alkane-to-haloalkane-radical-substitution": 142,
    "alkane-to-alkene-cracking": -116,
    "alkene-to-alkane-hydrogenation": 118,
    "alkene-to-alcohol-hydration": -108,
    "alkene-to-haloalkane-hydrohalogenation": 156,
    "haloalkane-to-alcohol-hydrolysis": -108,
    "haloalkane-to-nitrile-cyanide-substitution": 70,
    "haloalkane-to-amine-ammonia-substitution": 178,
    "alcohol-to-haloalkane-substitution": 108,
    "alcohol-to-aldehyde-oxidation": -100,
    "alcohol-to-ketone-oxidation": 100,
    "aldehyde-to-carboxylic-acid-oxidation": -48,
    "aldehyde-to-alcohol-reduction": 104,
    "ketone-to-alcohol-reduction": -104,
    "aldehyde-to-hydroxynitrile-cyanohydrin-addition": 150,
    "ketone-to-hydroxynitrile-cyanohydrin-addition": 76,
    "nitrile-to-carboxylic-acid-hydrolysis": -188,
    "nitrile-to-amine-reduction": 34,
    "carboxylic-acid-to-ester-esterification": 108,
    "carboxylic-acid-to-carboxylate-salt-neutralisation": 118,
    "carboxylic-acid-to-acyl-chloride-chlorination": -42,
    "acyl-chloride-to-ester-alcoholysis": 132,
    "acyl-chloride-to-amide-ammonolysis": -76,
    "ester-to-carboxylic-acid-hydrolysis": -108,
    "ester-to-carboxylate-salt-alkaline-hydrolysis": 110,
  },
  edgeLabelOffsets: {
    "alkane-to-haloalkane-radical-substitution": { x: -64, y: 84 },
    "alkane-to-alkene-cracking": { x: -54, y: -76 },
    "alkene-to-alkane-hydrogenation": { x: 54, y: 80 },
    "alkene-to-alcohol-hydration": { x: -76, y: -82 },
    "alkene-to-haloalkane-hydrohalogenation": { x: -92, y: 86 },
    "haloalkane-to-alcohol-hydrolysis": { x: -88, y: -82 },
    "haloalkane-to-nitrile-cyanide-substitution": { x: -70, y: 90 },
    "haloalkane-to-amine-ammonia-substitution": { x: 42, y: 124 },
    "alcohol-to-haloalkane-substitution": { x: 92, y: 82 },
    "alcohol-to-aldehyde-oxidation": { x: -18, y: -76 },
    "aldehyde-to-alcohol-reduction": { x: -66, y: 96 },
    "alcohol-to-ketone-oxidation": { x: 66, y: 96 },
    "ketone-to-alcohol-reduction": { x: -66, y: -96 },
    "aldehyde-to-carboxylic-acid-oxidation": { x: -24, y: -86 },
    "aldehyde-to-hydroxynitrile-cyanohydrin-addition": { x: 42, y: 130 },
    "ketone-to-hydroxynitrile-cyanohydrin-addition": { x: 60, y: 94 },
    "nitrile-to-carboxylic-acid-hydrolysis": { x: 74, y: -136 },
    "nitrile-to-amine-reduction": { x: -18, y: 78 },
    "carboxylic-acid-to-ester-esterification": { x: 80, y: -88 },
    "carboxylic-acid-to-carboxylate-salt-neutralisation": { x: 96, y: 132 },
    "carboxylic-acid-to-acyl-chloride-chlorination": { x: -20, y: -82 },
    "acyl-chloride-to-ester-alcoholysis": { x: 74, y: 116 },
    "acyl-chloride-to-amide-ammonolysis": { x: -92, y: 10 },
    "ester-to-carboxylic-acid-hydrolysis": { x: -80, y: 88 },
    "ester-to-carboxylate-salt-alkaline-hydrolysis": { x: 70, y: -74 },
  },
};
