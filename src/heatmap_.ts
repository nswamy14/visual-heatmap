// // Internal class that encapsulates private properties and methods

// import { HeatmapRenderer } from "./heatmapR";
// import {
// 	BackgroundImageConfig,
// 	GradientElement,
// 	HeatmapConfig,
// 	Point,
// 	Translate,
// } from "./types";

// export class Heatmap {
// 	private renderer: HeatmapRenderer;
// 	ctx;
// 	ratio;
// 	width;
// 	height;
// 	min;
// 	max;
// 	size;
// 	zoom;
// 	angle;
// 	intensity;
// 	translate;
// 	opacity;
// 	gradient;
// 	imageConfig;

// 	constructor(context: string | HTMLElement, config: HeatmapConfig) {
// 		this.renderer = new HeatmapRenderer(context, config);
// 		this.ctx = this.renderer.ctx;
// 		this.ratio = this.renderer.ratio;
// 		this.width = this.renderer.width;
// 		this.height = this.renderer.height;
// 		this.min = this.renderer.min;
// 		this.max = this.renderer.max;
// 		this.size = this.renderer.size;
// 		this.zoom = this.renderer.zoom;
// 		this.angle = this.renderer.angle;
// 		this.intensity = this.renderer.intensity;
// 		this.translate = this.renderer.translate;
// 		this.opacity = this.renderer.opacity;
// 		this.gradient = this.renderer.gradient;
// 		this.imageConfig = this.renderer.imageConfig;
// 	}

// 	/**
//    * Set the maximum data value for relative gradient calculations
//    * @param max - number
//    * @returns instance
//    */
// 	setMax(max: number) {
// 		return this.renderer.setMax(max);
// 	}

// 	/**
//    * Set the minimum data value for relative gradient calculations
//    * @param min - number
//    * @returns instance
//    */
// 	setMin(min: number) {
// 		return this.renderer.setMin(min);
// 	}

// 	/**
//    * Accepts array of objects with color value and offset
//    * @param gradient - Color Gradient
//    * @returns instance
//    */
// 	setGradient(gradient: GradientElement[]) {
// 		return this.renderer.setGradient(gradient);
// 	}

// 	/**
//    * Set the translate transformation on the canvas
//    * @param translate - Accepts array [x, y]
//    * @returns instance
//    */
// 	setTranslate(translate: Translate) {
// 		return this.renderer.setTranslate(translate);
// 	}

// 	/**
//    * Set the zoom transformation on the canvas
//    * @param zoom - Accepts float value
//    * @returns instance
//    */
// 	setZoom(zoom: number) {
// 		return this.renderer.setZoom(zoom);
// 	}

// 	/**
//    * Set the  rotation transformation on the canvas
//    * @param angle - Accepts angle in radians
//    * @returns instance
//    */
// 	setRotationAngle(angle: number) {
// 		return this.renderer.setRotationAngle(angle);
// 	}

// 	/**
//    * Set the point radius
//    * @param size - Accepts float value
//    * @returns instance
//    */
// 	setSize(size: number) {
// 		return this.renderer.setSize(size);
// 	}

// 	/**
//    * Set the intensity factor
//    * @param intensity - Accepts float value
//    * @returns instance
//    */
// 	setIntensity(intensity: number) {
// 		return this.renderer.setIntensity(intensity);
// 	}

// 	/**
//    * Set the opacity factor
//    * @param opacity - The opacity factor.
//    * @returns instance
//    */
// 	setOpacity(opacity: number) {
// 		return this.renderer.setOpacity(opacity);
// 	}

// 	/**
//    * Set the background image
//    * @param config - Accepts Object with { Url, height, width, x, and y} properties
//    * @returns instance
//    */
// 	setBackgroundImage(config: BackgroundImageConfig) {
// 		return this.renderer.setBackgroundImage(config);
// 	}

// 	/**
//    * After adding data points, need to invoke .render() method to update the heatmap
//    * @param data - The data points with 'x', 'y' and 'value'
//    * @param transIntactFlag - Flag indicating whether to apply existing heatmap transformations on the newly added data points
//    * @returns instance
//    */
// 	addData(data: Point[], transIntactFlag: boolean) {
// 		return this.renderer.addData(data, transIntactFlag);
// 	}

// 	/**
//    * @param data - Accepts an array of data points with 'x', 'y' and 'value'
//    * @returns instance
//    */
// 	renderData(data: Point[]) {
// 		return this.renderer.renderData(data);
// 	}

// 	/**
//    * Method to re-render the heatmap. This method needs to be invoked as and when configurations get changed
//    */
// 	render() {
// 		this.renderer.render();
// 	}

// 	/**
//    * Get projected co-ordinates relative to the heatmap layer
//    * @param data - The data point to project.
//    * @returns projected data point.
//    */

// 	projection(data: Point) {
// 		return this.renderer.projection(data);
// 	}

// 	/**
//    * Clears canvas
//    */
// 	clear() {
// 		this.renderer.clear();
// 	}
// }
