import { HeatmapInternal } from "./heatmapInternal";
import { HeatmapConfig } from "./types";

export default function Heatmap(
  context: string | HTMLElement,
  config: HeatmapConfig
) {
  return new HeatmapInternal(context, config);
}
