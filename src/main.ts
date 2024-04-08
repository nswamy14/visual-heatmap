import { Heatmap } from "./Heatmap";

export default function createHeatmap(
  context: string | HTMLElement,
  config = {}
) {
  return new Heatmap(context, config);
}
