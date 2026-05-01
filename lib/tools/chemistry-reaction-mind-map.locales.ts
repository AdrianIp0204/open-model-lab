export const chemistryReactionLocaleOverlays = {
  "zh-HK": {
    nodes: {
      alkene: {
        name: "烯烴",
        representativeStructureLabel: "代表成員：乙烯，CH2=CH2",
        functionalGroup: "碳碳雙鍵，C=C",
        boilingPoint: {
          summary: "沸點通常偏低，因為烯烴分子之間不能形成氫鍵，主要只有倫敦力。",
          details: [
            "碳鏈愈長，電子雲愈易極化，沸點通常愈高。",
            "支鏈增加通常會令分子較難緊密堆積，因此沸點偏低。",
          ],
          representativeExample: {
            kind: "representative-example",
            text: "乙烯的沸點約為 -104°C，但這只是小型成員的代表例子。",
          },
        },
        solubility: {
          summary: "基本上不溶於水，但可溶於非極性有機溶劑。",
          details: [
            "烴鏈本身屬非極性，水分子難以穩定它。",
            "即使碳鏈長度改變，對水的溶解度仍然很低。",
          ],
        },
        acidityBasicity: {
          summary: "整體上可視為中性。",
          details: [
            "它們的主要反應性來自富電子的 π 鍵，而不是水溶液中的酸鹼行為。",
          ],
        },
        notableProperties: [
          "因為 π 鍵較活潑，容易進行加成反應。",
          "可使溴水褪色，是常見的不飽和檢測。",
          "常用作製備醇、聚合物和鹵烷的原料。",
        ],
      },
      haloalkane: {
        name: "鹵烷",
        representativeStructureLabel: "代表成員：溴乙烷，CH3CH2Br",
        functionalGroup: "碳—鹵鍵，X 可代表 F、Cl、Br 或 I",
        boilingPoint: {
          summary: "沸點通常高於相應的烷烴，因為 C-X 鍵具極性，而鹵素亦增加分子的極化性。",
          details: [
            "鹵素愈重，摩爾質量與極化性通常愈大，因此沸點往往更高。",
            "鹵烷分子之間不能像醇那樣形成氫鍵，所以沸點通常仍低於相近大小的醇。",
          ],
          representativeExample: {
            kind: "representative-example",
            text: "溴乙烷的沸點比乙烷高得多，但仍遠低於乙醇，因為它不能形成氫鍵。",
          },
        },
        solubility: {
          summary: "通常只有微溶，甚至可視為不溶於水。",
          details: [
            "它們不能與水形成強氫鍵作用。",
            "與其相比，鹵烷通常較易溶於有機溶劑。",
          ],
        },
        acidityBasicity: {
          summary: "在一般水溶液條件下可視為中性。",
          details: [
            "真正關鍵是極化的 C-X 鍵，令連接鹵素的碳原子較易受到親核試劑進攻。",
          ],
        },
        notableProperties: [
          "由氯代烷到碘代烷，C-X 鍵通常愈弱，因此反應性常會增加。",
          "可在不同條件下進行取代或消去反應。",
          "是製備醇、胺及其他取代產物的重要中間體。",
        ],
      },
      alcohol: {
        name: "醇",
        representativeStructureLabel: "代表成員：乙醇，CH3CH2OH",
        functionalGroup: "羥基，-OH",
        boilingPoint: {
          summary: "沸點高於相近大小的烷烴和鹵烷，因為醇分子之間可以形成氫鍵。",
          details: [
            "碳鏈愈長，倫敦力愈強，沸點一般也會上升。",
            "支鏈增加通常會令沸點比相同分子式的直鏈異構體低。",
          ],
          representativeExample: {
            kind: "representative-example",
            text: "乙醇的沸點約為 78°C，但這只是整個家族中的代表成員。",
          },
        },
        solubility: {
          summary: "較小的醇相當易溶於水，但碳鏈愈長，溶解度便會下降。",
          details: [
            "-OH 基可與水形成強氫鍵。",
            "當非極性的烴鏈變長時，疏水部分的影響會愈來愈大。",
          ],
        },
        acidityBasicity: {
          summary: "在日常條件下大致可視為中性，只表現出比羧酸弱得多的酸性。",
          details: [
            "O-H 鍵可被很強的鹼去質子化，但一般水溶液中不會把醇視為強酸。",
            "氧原子的孤電子對亦令醇在強酸性介質中可作非常弱的鹼。",
          ],
        },
        notableProperties: [
          "可在不同條件下被氧化、脫水，或轉化為鹵烷。",
          "一級醇和二級醇的氧化產物不同，所以必須注意適用範圍。",
          "氫鍵對沸點以及較小醇在水中的行為影響很大。",
        ],
      },
      aldehyde: {
        name: "醛",
        representativeStructureLabel: "代表成員：乙醛，CH3CHO",
        functionalGroup: "端位羰基，-CHO",
        boilingPoint: {
          summary: "沸點通常介乎中間：因羰基具極性而高於相近烷烴，但因分子間不能自行形成氫鍵而低於醇。",
          details: [
            "分子愈大，倫敦力愈強，沸點便會上升。",
            "較小的醛通常相當揮發，而且容易被氧化。",
          ],
          representativeExample: {
            kind: "representative-example",
            text: "乙醛的沸點接近室溫，說明較小的醛可以相當揮發。",
          },
        },
        solubility: {
          summary: "較小的醛對水有一定溶解度，但隨碳鏈增長，溶解度會下降。",
          details: [
            "羰基氧可以接受來自水的氫鍵。",
            "它們不能像醇那樣提供氫鍵，因此一般比相近的小醇較不易與水互溶。",
          ],
        },
        acidityBasicity: {
          summary: "在簡單水溶液描述下大致可視為中性。",
          details: [
            "醛不會像羧酸或胺那樣被主要視為酸或鹼。",
            "這個家族的化學性質主要由極化的 C=O 鍵主導。",
          ],
        },
        notableProperties: [
          "容易被氧化為羧酸，通常比酮更易被氧化。",
          "常見的醛測試包括多侖試劑及斐林試劑。",
          "因羰基反應性明顯，醛常是醇與羧酸之間的重要中間體。",
        ],
      },
      ketone: {
        name: "酮",
        representativeStructureLabel: "代表成員：丙酮，CH3COCH3",
        functionalGroup: "內部羰基，>C=O",
        boilingPoint: {
          summary: "因羰基具極性而高於相近烷烴，但低於相近的醇，因為酮分子之間不能自行形成氫鍵。",
          details: [
            "隨碳鏈增長，色散力增加，沸點也會上升。",
            "在相同分子式下，支鏈增加通常會令沸點下降。",
          ],
          representativeExample: {
            kind: "representative-example",
            text: "丙酮的沸點約為 56°C，雖然它是極性分子，仍明顯低於乙醇。",
          },
        },
        solubility: {
          summary: "較小的酮對水有相當溶解度，但碳鏈愈長，溶解度便愈低。",
          details: [
            "羰基氧可以接受來自水的氫鍵。",
            "較長的烴鏈會削弱整體與水的相容性。",
          ],
        },
        acidityBasicity: {
          summary: "整體上大致可視為中性，化學性質主要由極化的羰基主導。",
          details: [
            "酮的羰基碳具親電性，但在入門層次下通常不把它描述成明顯的酸或鹼。",
          ],
        },
        notableProperties: [
          "在能氧化醛的溫和條件下，酮通常不會被氧化。",
          "可被還原回二級醇。",
          "較小的酮常是良好的有機溶劑，因為能與多種物質互溶。",
        ],
      },
      "carboxylic-acid": {
        name: "羧酸",
        representativeStructureLabel: "代表成員：乙酸，CH3COOH",
        functionalGroup: "羧基，-COOH",
        boilingPoint: {
          summary: "沸點通常較高，因為羧酸分子之間可形成強氫鍵，液態時常以二聚體形式存在。",
          details: [
            "烴鏈愈長，沸點通常會進一步上升。",
            "由於分子間作用特別強，羧酸常比相近大小的醇有更高沸點。",
          ],
          representativeExample: {
            kind: "representative-example",
            text: "乙酸的沸點遠高於乙醛，說明羧酸分子之間的氫鍵作用非常強。",
          },
        },
        solubility: {
          summary: "較小的羧酸相當易溶於水，但烴鏈愈長，溶解度便會下降。",
          details: [
            "羧基能與水形成強氫鍵。",
            "當疏水烴鏈變長時，整體行為會愈來愈受非極性部分主導。",
          ],
        },
        acidityBasicity: {
          summary: "屬弱酸，因為其共軛鹼羧酸根離子具有共振穩定作用。",
          details: [
            "與醇相比，它們較易放出 H+，因為去質子化後的負電荷可分散在兩個氧原子上。",
            "會與鹼、碳酸鹽及某些活潑金屬進行典型酸反應。",
          ],
        },
        notableProperties: [
          "較小的羧酸常有酸味或刺激性氣味。",
          "可在酸性條件下與醇進行酯化反應。",
          "同時具有羰基化學與一般酸性行為。",
        ],
      },
      ester: {
        name: "酯",
        representativeStructureLabel: "代表成員：乙酸乙酯，CH3COOCH2CH3",
        functionalGroup: "酯基，-COO-",
        boilingPoint: {
          summary: "沸點通常屬中等：酯分子具極性，但不像醇和羧酸那樣能彼此形成氫鍵。",
          details: [
            "通常比相近烷烴沸點高，但低於相近的醇和羧酸。",
            "酯分子愈大，沸點通常愈高。",
          ],
          representativeExample: {
            kind: "representative-example",
            text: "乙酸乙酯的沸點明顯低於乙酸，因為酯分子之間不能形成同樣強的氫鍵網絡。",
          },
        },
        solubility: {
          summary: "較小的酯對水有一定溶解度，但隨碳鏈增長，溶解度會進一步下降。",
          details: [
            "酯中的氧原子可以接受來自水的氫鍵，但本身不能提供氫鍵。",
            "許多酯都容易溶於有機溶劑。",
          ],
        },
        acidityBasicity: {
          summary: "在簡單水溶液描述下大致可視為中性。",
          details: [
            "這個家族更重要的是水解和親核酰基取代，而不是酸鹼行為。",
          ],
        },
        notableProperties: [
          "較小的酯常帶有明顯的水果香味。",
          "可在酸性或鹼性條件下水解回羧酸和醇，或先形成羧酸鹽。",
          "常用作溶劑、香料和調味分子。",
        ],
      },
    },
    edges: {
      "alkene-to-alcohol-hydration": {
        label: "水合",
        reactionType: "親電加成",
        applicability: {
          kind: "general",
          summary:
            "這是烯烴水合的家族層級路徑。對於不對稱烯烴，產物位置可能不同，因此用代表例子比寫成單一所謂通式更誠實。",
        },
        reagents: [{ name: "蒸氣", formula: "H2O(g)" }],
        catalysts: [{ name: "矽膠載磷酸催化劑", formula: "H3PO4" }],
        conditions: ["約 300°C", "高壓，通常約 60 至 70 atm"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "在這個家族層級的水合反應摘要中，通常不會另外強調獨立的離子方程式。",
        },
        mechanism: {
          applicability: "shown",
          summary: "先把 π 鍵質子化，再由水進攻碳正離子型中間體，最後去質子化生成醇。",
          steps: [
            "烯烴的 π 鍵先與酸催化劑提供的 H+ 反應，形成較穩定的碳正離子排列。",
            "水分子進攻電子不足的碳中心。",
            "失去一個質子後，催化劑被再生，並留下醇產物。",
          ],
        },
        notes: [
          "這裡用乙烯作代表例子，因為對不對稱烯烴而言，並沒有一條單一而完全準確的家族通式可概括所有產物位置。",
        ],
      },
      "alkene-to-haloalkane-hydrohalogenation": {
        label: "氫鹵化",
        reactionType: "親電加成",
        applicability: {
          kind: "general",
          summary:
            "這是 HX 加成到 C=C 的家族層級路徑。對於不對稱烯烴，產物位置需要另外討論，所以用代表例子較清晰。",
        },
        reagents: [{ name: "氫鹵酸，例如 HBr 或 HCl", formula: "HBr(g) / HCl(g)" }],
        conditions: ["通常在室溫或輕微加熱下進行"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "在這個層級，氫鹵化通常以分子方程式表示，而不另外強調離子方程式。",
        },
        mechanism: {
          applicability: "shown",
          summary: "烯烴進行親電加成：先質子化形成電子不足的中間體，再由鹵離子進攻。",
          steps: [
            "烯烴的 π 鍵先與氫鹵酸中的 H+ 反應。",
            "鹵離子進攻形成的碳正離子型中間體。",
            "原本的 C=C 被分別連上 H 和 X 的單鍵所取代。",
          ],
        },
        notes: [
          "不同氫鹵酸會得到不同鹵烷，所以這條邊表示的是家族路徑，而不是單一試劑配方。",
        ],
      },
      "haloalkane-to-alcohol-hydrolysis": {
        label: "水解成醇",
        reactionType: "親核取代",
        applicability: {
          kind: "general",
          summary:
            "單鹵烷可在含水氫氧化物條件下水解成醇。一級例子最能顯示簡單的一步取代，但三級例子通常會經不同途徑。",
        },
        reagents: [
          { name: "氫氧化鈉水溶液", formula: "NaOH(aq)" },
          { name: "氫氧化鉀水溶液", formula: "KOH(aq)" },
        ],
        conditions: ["加熱迴流"],
        ionicEquation: {
          applicability: "shown",
          equation: "CH3CH2Br(l) + OH-(aq) -> CH3CH2OH(l) + Br-(aq)",
        },
        mechanism: {
          applicability: "shown",
          summary: "在入門層次最常展示的是羥基離子取代鹵素的親核取代圖像。",
          steps: [
            "富電子的 OH- 進攻連接鹵素的碳原子。",
            "當新的 C-O 鍵形成時，C-X 鍵同時斷裂。",
            "最後得到醇與鹵離子。",
          ],
        },
        notes: [
          "這裡用溴乙烷作代表例子，因為整個家族不能靠單一化合物完全代表；而三級例子的機構在更高層次通常會另作處理。",
        ],
      },
      "alcohol-to-haloalkane-substitution": {
        label: "取代成鹵烷",
        reactionType: "取代反應",
        applicability: {
          kind: "general",
          summary:
            "醇可轉化為鹵烷，但所需試劑會隨要引入的鹵素而改變，因此用 HBr 代表路徑比假裝存在一條萬用通式更合適。",
        },
        reagents: [
          { name: "氫鹵酸", formula: "HX(aq)" },
          { name: "五氯化磷", formula: "PCl5" },
          { name: "亞硫酰氯", formula: "SOCl2" },
        ],
        catalysts: [{ name: "使用濃鹽酸時有時會配合氯化鋅", formula: "ZnCl2" }],
        conditions: ["視乎所用試劑，可在室溫或輕微加熱下進行"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "這類取代反應常以分子方程式表示，因為不同鹵化路線所用試劑系統並不相同。",
        },
        mechanism: {
          applicability: "shown",
          summary: "要令取代順利進行，通常需要先把羥基轉成較好的離去基。",
          steps: [
            "醇中的氧先被質子化，或被鹵化試劑活化。",
            "鹵離子或鹵化試劑取代已活化的離去基。",
            "水或其他離去基離去後，生成鹵烷。",
          ],
        },
        notes: [
          "代表例子使用 HBr；若改為製備氯代物或碘代物，常會改用不同的試劑系統與副產物。",
        ],
      },
      "alcohol-to-aldehyde-oxidation": {
        label: "氧化成醛",
        reactionType: "氧化",
        applicability: {
          kind: "subgroup-specific",
          summary: "只適用於一級醇。通常會把生成的醛即時蒸餾移走，以減少進一步氧化。",
        },
        reagents: [{ name: "酸化重鉻酸鉀(VI)", formula: "K2Cr2O7 / H+(aq)" }],
        conditions: ["輕微加熱", "醛一生成便蒸餾移走"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "在這個層次，這類有機氧化通常以 [O] 簡寫表示，而不另外強調離子方程式。",
        },
        mechanism: {
          applicability: "shown",
          summary: "在入門層次，通常把有機氧化概括為失去氫和得到氧，而不是完整展開氧化還原細節。",
          steps: [
            "氧化劑接受電子，而醇則轉化為羰基化合物。",
            "來自 O-H 鍵與鄰近碳原子的氫被移走。",
            "把產物及早移離反應混合物，可減少進一步被氧化為羧酸。",
          ],
        },
        notes: [
          "[O] 是這個層次常用的有機反應簡寫；完整的重鉻酸根氧化還原方程式通常在其他部分處理。",
        ],
      },
      "alcohol-to-ketone-oxidation": {
        label: "氧化成酮",
        reactionType: "氧化",
        applicability: {
          kind: "subgroup-specific",
          summary: "只適用於二級醇。",
        },
        reagents: [{ name: "酸化重鉻酸鉀(VI)", formula: "K2Cr2O7 / H+(aq)" }],
        conditions: ["加熱迴流"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "這類氧化反應在這個層次通常以中性的有機方程式表示，而不另外寫出離子方程式。",
        },
        mechanism: {
          applicability: "shown",
          summary: "二級醇被氧化時會失去氫並形成羰基，但不會像一級醇那樣再進一步生成羧酸。",
          steps: [
            "氧化劑把 C-OH 結構轉變為 C=O。",
            "O-H 鍵及帶有羥基的碳原子上的氫被移走。",
            "對二級醇而言，酮就是穩定的氧化產物。",
          ],
        },
        notes: [
          "三級醇不包括在這條邊內，因為在相同的簡單規則下它們不會被乾淨地氧化。",
        ],
      },
      "aldehyde-to-carboxylic-acid-oxidation": {
        label: "氧化成羧酸",
        reactionType: "氧化",
        applicability: {
          kind: "general",
          summary: "這是醛被氧化為羧酸的家族層級路徑。醛之所以容易被氧化，是因為羰基碳仍連有至少一個氫原子。",
        },
        reagents: [
          { name: "酸化重鉻酸鉀(VI)", formula: "K2Cr2O7 / H+(aq)" },
          { name: "酸化高錳酸鹽", formula: "MnO4-(aq) / H+(aq)" },
        ],
        conditions: ["加熱迴流"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "在這個層次，這類家族氧化通常以 [O] 簡寫表示，而不另外強調離子方程式。",
        },
        mechanism: {
          applicability: "shown",
          summary: "醛容易被氧化，因為羰基碳上仍有可在氧化過程中被取代的一個氫。",
          steps: [
            "氧化劑把醛轉化為更高氧化態的羧酸。",
            "在標準有機化學簡寫中，這通常以 [O] 來表示得氧與失氫。",
          ],
        },
        notes: [
          "這種容易被氧化的特性，也是常用質性測試用來區分醛和酮的原因之一。",
        ],
      },
      "aldehyde-to-alcohol-reduction": {
        label: "還原成醇",
        reactionType: "還原",
        applicability: {
          kind: "general",
          summary: "醛可被還原成一級醇。",
        },
        reagents: [{ name: "硼氫化鈉", formula: "NaBH4" }],
        conditions: ["在水溶液或醇溶液中進行", "室溫或輕微加熱"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "這類還原在這個層次通常以中性的分子方程式配合 [H] 簡寫表示。",
        },
        mechanism: {
          applicability: "shown",
          summary: "還原劑先提供氫化物進攻羰基碳，之後再經質子化生成一級醇。",
          steps: [
            "還原劑把氫化物轉移到羰基碳上。",
            "含氧中間體在後續步驟中被質子化。",
            "原本的羰基因此轉變成相應的一級醇。",
          ],
        },
        notes: [
          "在入門有機化學中，這類還原常以硼氫化鈉配合 [H] 簡寫來表示。",
        ],
      },
      "ketone-to-alcohol-reduction": {
        label: "還原成醇",
        reactionType: "還原",
        applicability: {
          kind: "general",
          summary: "酮可被還原成二級醇。",
        },
        reagents: [{ name: "硼氫化鈉", formula: "NaBH4" }],
        conditions: ["在水溶液或醇溶液中進行", "室溫或輕微加熱"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "這類還原在這個層次通常以中性的分子方程式配合 [H] 簡寫表示。",
        },
        mechanism: {
          applicability: "shown",
          summary: "還原劑先提供氫化物進攻羰基碳，之後再經質子化生成二級醇。",
          steps: [
            "還原劑把氫化物轉移到羰基碳上。",
            "含氧中間體在後續步驟中被質子化。",
            "原本的羰基因此轉變成相應的二級醇。",
          ],
        },
        notes: [
          "在入門有機化學中，這類還原常以硼氫化鈉配合 [H] 簡寫來表示。",
        ],
      },
      "carboxylic-acid-to-ester-esterification": {
        label: "酯化",
        reactionType: "縮合／親核酰基取代",
        applicability: {
          kind: "general",
          summary: "這條邊表示羧酸與醇之間可逆的家族層級酯化。若某一反應物過量，或把水移走，產率通常會較高。",
        },
        additionalOrganicReactants: ["醇家族"],
        reagents: ["醇家族"],
        catalysts: [{ name: "濃硫酸", formula: "H2SO4(l)" }],
        conditions: ["加熱迴流"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "酯化通常以可逆的分子方程式表示，而不另外強調離子方程式。",
        },
        mechanism: {
          applicability: "shown",
          summary: "酸催化先活化羰基，再由醇進攻，最後消去水，形成可逆的酰基取代過程。",
          steps: [
            "羰基氧先被酸催化劑質子化。",
            "醇的氧原子進攻羰基碳。",
            "中間體內部再發生質子轉移。",
            "水分子離去，同時催化劑被再生，生成酯。",
          ],
        },
        notes: [
          "額外所需的有機共反應物放在邊的資料中，因為節點仍然代表整個家族，而不是超圖中的多輸入節點。",
        ],
      },
      "ester-to-carboxylic-acid-hydrolysis": {
        label: "水解成羧酸",
        reactionType: "水解",
        applicability: {
          kind: "general",
          summary: "這條邊顯示的是酸催化水解，因為它可直接回到羧酸家族。實際上常用鹼解，但那會先生成羧酸鹽，再經酸化才回到羧酸。",
        },
        reagents: [{ name: "水", formula: "H2O(l)" }],
        catalysts: [{ name: "稀酸", formula: "H+(aq)" }],
        conditions: ["加熱迴流"],
        ionicEquation: {
          applicability: "not-typically-shown",
          note: "酸催化酯水解在這個層次通常視為分子平衡，而不另外寫成離子方程式。",
        },
        mechanism: {
          applicability: "shown",
          summary: "酸催化的酯水解可看作酯化的逆反應：先質子化，再由水進攻，最後中間體裂解。",
          steps: [
            "酯的羰基氧先被酸催化劑質子化。",
            "水分子進攻羰基碳。",
            "四面體中間體經質子轉移重新整理。",
            "醇離去，而酸催化劑被再生。",
          ],
        },
        notes: [
          "代表例子同時生成醇，但這條有向邊把羧酸家族視為這條逆反應的主要目的地。",
        ],
      },
    },
  },
} as const;
