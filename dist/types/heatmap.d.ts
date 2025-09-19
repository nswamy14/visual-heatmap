import { BackgroundImageConfig, GradientElement, HearmapExData, HeatmapConfig, MappedGradient, Point, ShaderProgram, Translate } from "./types";
export declare class HeatmapRenderer {
    ctx: WebGL2RenderingContext | null;
    ratio: number;
    width: number;
    height: number;
    imageConfig: BackgroundImageConfig | null;
    configMin: number | null;
    configMax: number | null;
    min: number;
    max: number;
    size: number;
    zoom: number;
    angle: number;
    intensity: number;
    translate: [number, number];
    opacity: number;
    disableCircularFalloff: boolean;
    hearmapExData: HearmapExData | object;
    gradient: MappedGradient | null;
    _imageTexture: WebGLTexture | null;
    _pDataLength: number | undefined;
    _gradShadOP: ShaderProgram;
    _colorShadOP: ShaderProgram;
    _imageShaOP: ShaderProgram;
    _fbTexObj: WebGLTexture;
    _fbo: WebGLFramebuffer;
    private layer;
    private dom;
    private imgWidth;
    private imgHeight;
    private heatmapData;
    private type;
    constructor(container: string | HTMLElement, config: HeatmapConfig);
    /**
    * Invoke resize method on container resize.
    */
    resize(): void;
    clear(): void;
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
   * Set the translate on the Heatmap
   * @param translate - Accepts array [x, y]
   * @returns instance
   */
    setTranslate(translate: Translate): this;
    /**
   * Set the zoom transformation on the Heatmap
   * @param zoom - Accepts float value
   * @returns instance
   */
    setZoom(zoom: number): HeatmapRenderer;
    /**
   * Set the  rotation transformation on the Heatmap
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
   * Set whether to disable circular falloff
   * @param disableCircularFalloff - Boolean to disable circular falloff effect.
   * @returns instance
   */
    setDisableCircularFalloff(disableCircularFalloff: boolean): HeatmapRenderer;
    /**
   * Set the background image
   * @param config - Accepts Object with { url, height, width, x, and y} properties
   * @returns instance
   */
    setBackgroundImage(config: BackgroundImageConfig): this | undefined;
    /**
   * Clear heatmap
   */
    clearData(): void;
    /**
   * Method to append data points. This method automatically adds new data points to the existing dataset and the heatmap updates in immediately. no need to call the ".render" method separately.
   * @param data - The data points with 'x', 'y' and 'value'
   * @param transIntactFlag - Flag indicating whether to apply existing heatmap transformations on the newly added data points
   * @returns instance
   */
    addData(data: Point[], transIntactFlag: boolean): HeatmapRenderer;
    /**
   * Method to load data. This will override any existing data.
   * @param data - Accepts an array of data points with 'x', 'y' and 'value'
   * @returns instance
   */
    renderData(data: Point[]): HeatmapRenderer;
    /**
   * Method to update the heatmap. This method to be invoked on every change in configuration.
   */
    render(): void;
    /**
   * Get projected co-ordinates relative to the heatmap
   * @param data - The data point to project.
   * @returns projected data point.
   */
    projection(data: Point): {
        x: number;
        y: number;
    };
    /**
     * Extract the rendered canvas as an image blob
     * @param mimeType - The image format (e.g., 'image/png', 'image/jpeg'). Defaults to 'image/png'
     * @param quality - A number between 0 and 1 indicating image quality for lossy formats. Defaults to 0.92
     * @returns Promise that resolves with a Blob containing the image data
     */
    toBlob(mimeType?: string, quality?: number): Promise<Blob>;
}
