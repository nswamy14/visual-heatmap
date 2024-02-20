# Visual-Heatmap Js [![npm](https://img.shields.io/npm/v/visual-heatmap.svg)](https://www.npmjs.com/package/visual-heatmap) [![Downloads](https://img.shields.io/npm/dm/visual-heatmap.svg)](https://www.npmjs.com/package/visual-heatmap)
Visual Heatmap, an open-source JavaScript module, emerges as a powerful tool designed to render large-scale heatmaps with exceptional performance. This framework is based on advanced graphical rendering - WebGL/Shaders. It can render 500,000+ data points with a good framerate.

### Examples:
<p align="center">
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html"> <label>Click<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap3.png" width=1200> </a>
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html"> <label>Click<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap1.png" width=1200></a>
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap2.html"> <label>Click<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap2.png" width=1200> </a>
<a href="https://nswamy14.github.io/visual-heatmap/demo/heatmapWithLabels.html"> <label>Click<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap4.png" width=1200> </a>
</p>

# Installing

npm
```
npm i visual-heatmap --save
```
Or Download source code from below links

* [visualHeatmap.min.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.min.js)
* [visualHeatmap.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.js)
* [visualHeatmap.esm.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.esm.js)



# Usage

### Importing
Visual-Heatmap provides ES6 and UMD modules. Accordingly module can be embeded into applications.

```
import Heatmap from 'visual-heatmap'
```

### Instance creation
visualHeatmap provides a API to create heatmap instance. API accepts container/containerId and config as an input. A context element will be created under the provided Div #containerId.
```Javascript
let instance = Heatmap('#containerId', {
        size: 30.0,  //Radius of the data point, in pixels. Default: 20
        max: 100,  // if not set, will be derived from data
        min: 0,  // if not set, will be derived from data
        intensity: 1.0, 
        background: {
            url: "urlPath",
            width: 100, // if not set, viewport width of the image will be considered
            height: 100, // if not set, viewport height of the image will be considered
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
**Container/ContainerId** : The container div element or a string CSS Query selector which identifies the container.

**Config Object** :
```
{
     size : Radius of the data point, in pixels. Default: 20
     max : Max data Value for relative gradient computation. if not set, will be derived from data.
     min : Min data Value for relative gradient computation. if not set, will be derived from data.
     intensity : intensity factor. Default: 1.0
     opacity : Opacity factor. Default: 1.0
     rotationAngle : Rotation angle. Default: 0
     translate : translate vector [x, y]. Default: [0,0]
     zoom : Zoom Factor. Default: 1.0
     gradient : Color Gradient, array of objects with color value and offset.
     background: To set background of the heatMap. Value : { url: , x: , y: , height: , width: }
}
```

## Adding Data

### instance.renderData([])
Accepts an array of data points with 'x', 'y' and 'value'.  [Demo](https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html)
```Javascript
instance.renderData([])
```

### instance.addData([], transformationIntactflag);
Accepts an array of data points with 'x', 'y' and 'value' and a flag to specify to apply existing heatmap transformations on the newly added data points. After adding data points, need to invoke `.render()` method to update the heatmap.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)
```Javascript
instance.addData([],transformationIntactflag)
```

## Render API
Method to re-render the heatmap. This method needs to be invoked as and when configurations get changed. [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html)
```Javascript
instance.render()
```

## Configuration Setting API

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

