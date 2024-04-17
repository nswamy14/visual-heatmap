import { HeatmapRenderer } from "./heatmapRenderer";
import { BackgroundImageConfig, GradientElement, HeatmapConfig, Point, Translate } from "./types";
export declare class Heatmap {
    private renderer;
    ctx: WebGL2RenderingContext | null;
    ratio: number;
    width: number;
    height: number;
    min: number;
    max: number;
    size: number;
    zoom: number;
    angle: number;
    intensity: number;
    translate: [number, number];
    opacity: number;
    gradient: import("./types").MappedGradient | null;
    imageConfig: BackgroundImageConfig | null;
    constructor(context: string | HTMLElement, config: HeatmapConfig);
    /**
   * Set the maximum data value for relative gradient calculations
   * @param max - number
   * @returns instance
   */
    setMax(max: number): HeatmapRenderer;
    /**
   * Set the minimum data value for relative gradient calculations
   * @param min - number
   * @returns instance
   */
    setMin(min: number): HeatmapRenderer;
    /**
   * Accepts array of objects with color value and offset
   * @param gradient - Color Gradient
   * @returns instance
   */
    setGradient(gradient: GradientElement[]): HeatmapRenderer;
    /**
   * Set the translate transformation on the canvas
   * @param translate - Accepts array [x, y]
   * @returns instance
   */
    setTranslate(translate: Translate): HeatmapRenderer;
    /**
   * Set the zoom transformation on the canvas
   * @param zoom - Accepts float value
   * @returns instance
   */
    setZoom(zoom: number): HeatmapRenderer;
    /**
   * Set the  rotation transformation on the canvas
   * @param angle - Accepts angle in radians
   * @returns instance
   */
    setRotationAngle(angle: number): HeatmapRenderer;
    /**
   * Set the point radius
   * @param size - Accepts float value
   * @returns instance
   */
    setSize(size: number): HeatmapRenderer;
    /**
   * Set the intensity factor
   * @param intensity - Accepts float value
   * @returns instance
   */
    setIntensity(intensity: number): HeatmapRenderer;
    /**
   * Set the opacity factor
   * @param opacity - The opacity factor.
   * @returns instance
   */
    setOpacity(opacity: number): HeatmapRenderer;
    /**
   * Set the background image
   * @param config - Accepts Object with { Url, height, width, x, and y} properties
   * @returns instance
   */
    setBackgroundImage(config: BackgroundImageConfig): HeatmapRenderer | undefined;
    /**
   * After adding data points, need to invoke .render() method to update the heatmap
   * @param data - The data points with 'x', 'y' and 'value'
   * @param transIntactFlag - Flag indicating whether to apply existing heatmap transformations on the newly added data points
   * @returns instance
   */
    addData(data: Point[], transIntactFlag: boolean): HeatmapRenderer;
    /**
   * @param data - Accepts an array of data points with 'x', 'y' and 'value'
   * @returns instance
   */
    renderData(data: Point[]): HeatmapRenderer;
    /**
   * Method to re-render the heatmap. This method needs to be invoked as and when configurations get changed
   */
    render(): void;
    /**
   * Get projected co-ordinates relative to the heatmap layer
   * @param data - The data point to project.
   * @returns projected data point.
   */
    projection(data: Point): {
        x: number;
        y: number;
    };
    /**
   * Clears canvas
   */
    clear(): void;
}
