# Visual-Heatmap Js [![npm](https://img.shields.io/npm/v/visual-heatmap.svg)](https://www.npmjs.com/package/visual-heatmap) [![Downloads](https://img.shields.io/npm/dm/visual-heatmap.svg)](https://www.npmjs.com/package/visual-heatmap)
Open source javascript module for rendering high performance, large scale heatmap.

Visual Heatmap is based on advanced graphical rendering context - WebGL/Shaders. It can render 500,000+ data points with a good framerate.

<p align="center">
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html"> <label>Click me<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap3.png" width=1200> </a>
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html"> <label>Click me<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap1.png" width=1200></a>
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap2.html"> <label>Click me<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap2.png" width=1200> </a>
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmapWithLabels.html"> <label>Click me<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap4.png" width=1200> </a>
</p>

## Installing

If npm
```
npm i visual-heatmap --save
```
Download source code from below links

* [visualHeatmap.min.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.min.js)
* [visualHeatmap.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.js)
* [visualHeatmap.esm.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.esm.js)

Visual-Heatmap is written in ES6 Modules. To import use below syntax

Importing everthing into namespace
```
import Heatmap from 'visual-heatmap'
```

## VisualHeatmapJs - API

### visualHeatmap()
visualHeatmap provides a API to create context **WebGL**. API accepts container/containerId and config as an input. A layer will be created under the provided Div #containerId.
```Javascript
let instance = Heatmap('#containerId', {
        size: 30.0,
        max: 100,  // if not set, will be derived from data
        min: 0,  // if not set, will be derived from data
        intensity: 1.0,
        background: {
            url: "path",
            width: 100, // if not set, naturalWidth of the image will be considered
            height: 100, // if not set, naturalWidth of the image will be considered
            x: 0,
            y: 0
        },
        gradient: [{
            color: [0, 0, 255, 1.0],
            offset: 0
        }, {
            color: [0, 0, 255, 1.0],
            offset: 0.2
        }, {
            color: [0, 255, 0, 1.0],
            offset: 0.45
        }, {
            color: [255, 255, 0, 1.0],
            offset: 0.85
        }, {
            color: [255, 0, 0, 1.0],
            offset: 1.0
        }]
    });
```
**Container/ContainerId** The container div element or a string CSS Query selector which identifies the container.

**Config**
Object with config properties.
```
{
size : Radius of the data point, in pixels.
max : Max data Value for relative gradient computation.
min : Min data Value for relative gradient computation.
intensity : intensity factor.
opacity : Opacity factor.
rotationAngle : Rotation angle.
translate : translate vector [x, y].
zoom : Zoom Factor.
gradient : Color Gradient, array of objects with color value and offset.
background: To set background of the heatMap
}
```


### instance.renderData([])
Accepts an array of data points with 'x', 'y' and 'value'.  [Demo](https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html)

### instance.addData([], transformationIntactflag);
Accepts an array of data points with 'x', 'y' and 'value' and a flag to specify to apply existing canvas transformations on the newly added data points.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.setMax(number)
To set max data value, for relative gradient calculations.

### instance.setMin(number)
To set min data value, for relative gradient calculations.

### instance.setTranslate([number, number])
Api to perform translate transformation on the canvas. Accepts array[x, y] as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.setZoom(number)
Api to perform zoom transformation on the canvas. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.setRotationAngle(number)
Api to perform rotation transformation on the canvas. Accepts angle in radians.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.setSize(number)
Api to set point radius. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.setIntensity(number)
Api to set Intensity factor. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.setOpacity(number)
Api to set Opacity factor. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.setBackgroundImage({ url: , x: , y: , height: , width: })
Api to set Background image. Accepts Object with { Url, height, width, x, and y} properties as input
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

### instance.projection({x: , y: })
Api to get projected co-ordinates relative to the heatmap layer.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmapWithLabels.html)

### instance.clear()
Api to clear canvas.

