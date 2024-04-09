
import { HeatmapRenderer } from './heatmap.js';

export default function Heatmap (context, config = {}) {
	return new HeatmapRenderer(context, config);
}
