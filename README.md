# Visual-Heatmap Js
Open source javascript module for high performance, large scale heatmap rendering.

Visual Heatmap is based on advanced graphical rendering context - WebGL/Shaders. It can render 500,000+ data points with a good framerate.

<p align="center">
  <a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html"> <label>Click me<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap1.png" width=1200></a>
   <a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap2.html"> <label>Click me<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap2.png" width=1200> </a>
  <a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html"> <label>Click me<label><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap3.png" width=1200> </a>
</p>

## Installing

If npm
```
npm i visual-heatmap --save
```
Download source code from below links

* [visualHeatmap.min.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.min.js)
* [visualHeatmap.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.js)
* [visualHeatmap.esm.browser.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.esm.browser.js)

Visual-Heatmap is written in ES6 Modules. To import use below syntax

Importing everthing into namespace
```
import Heatmap from 'visual-heatmap'
```

## VisualHeatmapJs - API

### visualHeatmap()
visualHeatmap provides a API to create context **WebGL**. API accepts containerId and config as an input. A layer will be created under the provided Div #containerId.
```Javascript
let instance = Heatmap('#canvas', {
        size: 30.0,
        max: 100,
        blurr: 1.0,
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
#### ContainerId
CSS Query selector which identifies container.

#### Config
Object with config properties.

**size :** Radius of the data point, in pixels.

**max :** Max data Value for relative gradient computation.

**blurr :** Blurr factor.

**opacity :** Opacity factor.

**rotationAngle :** Rotation angle.

**translate :** translate vector [x, y].

**zoom :** Zoom Factor.

**gradient :** Color Gradient, array of objects with color value and offset.

#### instance.renderData([])
Accepts array of data points with 'x', 'y' and 'value'.  [Demo](https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html)

#### instance.addData([], transformationIntactflag);
Accepts array of data points with 'x', 'y' and 'value' and a flag to specify to apply existing canvas tranformations on the newly added data points.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

#### instance.setMax()
To set max data value, for relative gradient calculations.

#### instance.setTranslate()
Api to perform translate transformation on the canvas. Accepts array[x, y] as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

#### instance.setZoom()
Api to perform zoom transformation on the canvas. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

#### instance.setRotationAngle()
Api to perform rotation transformation on the canvas. Accepts angle in radians.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

#### instance.setSize()
Api to set point radius. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

#### instance.setBlurr()
Api to set Blurr factor. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

#### instance.setOpacity()
Api to set Opacity factor. Accepts float value as an input.
Try [Example](https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html)

#### instance.clear()
Api to clear canvas.

