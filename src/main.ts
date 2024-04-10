import { HeatmapRenderer } from "./heatmap";
import { HeatmapConfig } from "./types";

export default function Heatmap(
  context: string | HTMLElement,
  config: HeatmapConfig
) {
  return new HeatmapRenderer(context, config);
}
