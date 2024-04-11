// Internal class that encapsulates private properties and methods

import { HeatmapRenderer } from "./heatmap";
import {
  BackgroundImageConfig,
  GradientElement,
  HeatmapConfig,
  Point,
  Translate,
} from "./types";

export class HeatmapInternal {
  private renderer: HeatmapRenderer;

  constructor(context: string | HTMLElement, config: HeatmapConfig) {
    this.renderer = new HeatmapRenderer(context, config);
  }

  /**
   * Set the maximum data value for relative gradient calculations
   * @param max - number
   * @returns HeatmapRenderer instance
   */
  setMax(max: number): HeatmapRenderer {
    return this.renderer.setMax(max);
  }

  /**
   * Set the minimum data value for relative gradient calculations
   * @param min - number
   * @returns HeatmapRenderer instance
   */
  setMin(min: number): HeatmapRenderer {
    return this.renderer.setMin(min);
  }

  /**
   * Accepts array of objects with color value and offset
   * @param gradient - Color Gradient
   * @returns HeatmapRenderer instance
   */
  setGradient(gradient: GradientElement[]): HeatmapRenderer {
    return this.renderer.setGradient(gradient);
  }

  /**
   * Set the translate transformation on the canvas
   * @param translate - Accepts array [x, y]
   * @returns HeatmapRenderer instance
   */
  setTranslate(translate: Translate) {
    this.renderer.setTranslate(translate);
  }

  /**
   * Set the zoom transformation on the canvas
   * @param zoom - Accepts float value
   * @returns HeatmapRenderer instance
   */
  setZoom(zoom: number): HeatmapRenderer {
    return this.renderer.setZoom(zoom);
  }

  /**
   * Set the  rotation transformation on the canvas
   * @param angle - Accepts angle in radians
   * @returns HeatmapRenderer instance
   */
  setRotationAngle(angle: number): HeatmapRenderer {
    return this.renderer.setRotationAngle(angle);
  }

  /**
   * Set the point radius
   * @param size - Accepts float value
   * @returns HeatmapRenderer instance
   */
  setSize(size: number): HeatmapRenderer {
    return this.renderer.setSize(size);
  }

  /**
   * Set the intensity factor
   * @param intensity - Accepts float value
   * @returns HeatmapRenderer instance
   */
  setIntensity(intensity: number): HeatmapRenderer {
    return this.renderer.setIntensity(intensity);
  }

  /**
   * Set the opacity factor
   * @param opacity - The opacity factor.
   * @returns HeatmapRenderer instance
   */
  setOpacity(opacity: number): HeatmapRenderer {
    return this.renderer.setOpacity(opacity);
  }

  /**
   * Set the background image
   * @param config - Accepts Object with { Url, height, width, x, and y} properties
   * @returns HeatmapRenderer instance
   */
  setBackgroundImage(config: BackgroundImageConfig) {
    this.renderer.setBackgroundImage(config);
  }

  /**
   * After adding data points, need to invoke .render() method to update the heatmap
   * @param data - The data points with 'x', 'y' and 'value'
   * @param transIntactFlag - Flag indicating whether to apply existing heatmap transformations on the newly added data points
   * @returns HeatmapRenderer instance
   */
  addData(data: Point[], transIntactFlag: boolean): HeatmapRenderer {
    return this.renderer.addData(data, transIntactFlag);
  }

  /**
   * @param data - Accepts an array of data points with 'x', 'y' and 'value'
   * @returns HeatmapRenderer instance
   */
  renderData(data: Point[]): HeatmapRenderer {
    return this.renderer.renderData(data);
  }

  /**
   * Method to re-render the heatmap. This method needs to be invoked as and when configurations get changed
   */
  render() {
    this.renderer.render();
  }

  /**
   * Get projected co-ordinates relative to the heatmap layer
   * @param data - The data point to project.
   * @returns projected data point.
   */

  projection(data: Point) {
    this.renderer.projection(data);
  }

  /**
   * Clears canvas
   */
  clear() {
    this.renderer.clear();
  }
}
