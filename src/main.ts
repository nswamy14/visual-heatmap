import { HeatmapRenderer } from "./heatmap";
import { HeatmapConfig } from "./types";

export default function (context: string | HTMLElement, config: HeatmapConfig) {
	return new HeatmapRenderer(context, config);
}
