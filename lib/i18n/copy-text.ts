import type { AppLocale } from "@/i18n/routing";

export function copyText(locale: AppLocale | undefined, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

export function getCompareSetupLabel(locale: AppLocale | undefined, setup: "a" | "b") {
  return setup === "a"
    ? copyText(locale, "Setup A", "設定 A")
    : copyText(locale, "Setup B", "設定 B");
}

export function getCompareBadgeLabel(locale: AppLocale | undefined, badge: "editing" | "locked") {
  return badge === "editing"
    ? copyText(locale, "editing", "編輯中")
    : copyText(locale, "locked", "鎖定");
}

export function getVariantLabel(
  locale: AppLocale | undefined,
  variant: "live" | "baseline" | "variant",
) {
  switch (variant) {
    case "baseline":
      return copyText(locale, "Baseline", "基準版本");
    case "variant":
      return copyText(locale, "Variant", "變化版本");
    default:
      return copyText(locale, "Live", "即時");
  }
}

export function localizeKnownCompareText(locale: AppLocale | undefined, value: string) {
  if (locale !== "zh-HK") {
    return value;
  }

  switch (value) {
    case "Live":
      return "即時";
    case "Live setup":
      return "即時設定";
    case "Live state":
      return "即時狀態";
    case "Live search":
      return "即時搜尋";
    case "Setup A":
      return "設定 A";
    case "Setup B":
      return "設定 B";
    case "Baseline":
      return "基準版本";
    case "Variant":
      return "變化版本";
    default:
      return value;
  }
}

export function localizeKnownSimulationText(locale: AppLocale | undefined, value: string) {
  if (locale !== "zh-HK") {
    return value;
  }

  switch (value) {
    case "Line state":
      return "直線狀態";
    case "Rotational state":
      return "轉動狀態";
    case "Resonance state":
      return "共鳴狀態";
    case "buffer bench":
      return "緩衝實驗台";
    case "buffer readout":
      return "緩衝讀數";
    case "Solution bench":
      return "溶液實驗台";
    case "Solution readout":
      return "溶液讀數";
    case "Linear contrast":
      return "線性對照";
    case "Binary-search readout":
      return "二分搜尋讀數";
    case "Matter-wave state":
      return "物質波狀態";
    case "Local rate":
      return "局部變化率";
    case "Pattern state":
      return "圖樣狀態";
    case "Prism state":
      return "稜鏡狀態";
    case "Beat state":
      return "拍頻狀態";
    case "Doppler state":
      return "都卜勒狀態";
    case "Alignment readout":
      return "對齊讀數";
    case "Optics state":
      return "光學狀態";
    case "Reversible bench":
      return "可逆實驗台";
    case "Live readout":
      return "即時讀數";
    case "Field state":
      return "場狀態";
    case "Current transform":
      return "電流變換";
    case "Inverse readout":
      return "反向讀數";
    case "Launch state":
      return "發射狀態";
    case "Probe state":
      return "探測狀態";
    case "Running total":
      return "累積總量";
    case "Parametric readout":
      return "參數讀數";
    case "Mirror state":
      return "鏡面狀態";
    case "Constrained area":
      return "受限面積";
    case "Asymptotes and intercepts":
      return "漸近線與截距";
    case "Decay state":
      return "衰變狀態";
    case "Emission state":
      return "發射狀態";
    case "Approach readout":
      return "逼近讀數";
    case "Sorting readout":
      return "排序讀數";
    case "Wave state":
      return "波動狀態";
    case "Vector readout":
      return "向量讀數";
    case "Balance state":
      return "平衡狀態";
    case "Projection readout":
      return "投影讀數";
    case "Compare summary":
      return "比較摘要";
    case "Synthesis reading":
      return "綜合解讀";
    case "Graph":
      return "圖表";
    case "Current family":
      return "電流族";
    case "Fluid bench":
      return "流體實驗台";
    case "Steady stream tube":
      return "穩定流管";
    case "Magnet pass":
      return "磁鐵通過";
    case "principal axis":
      return "主軸";
    default:
      return localizeKnownCompareText(locale, value);
  }
}
