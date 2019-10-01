# Visual-Heatmap Js
Open source javascript module for high performance, large scale heatmap rendering.

Visual Heatmap is based on advanced graphical rendering context - WebGL/Shaders. It can render 500,000+ data points with a good framerate.

<p align="center">
  <a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap1.html"><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap1.png" width=1200></a>
   <a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap2.html"><img src="https://nswamy14.github.io/visual-heatmap/snaps/snap2.png" width=1200> </a>
  <a href="https://nswamy14.github.io/visual-heatmap/demo/heatmap3.html">  <img src="https://nswamy14.github.io/visual-heatmap/snaps/snap3.png" width=1200> </a>
</p>

## Installing

If npm
```
npm i visual-heatmap --save
```
Download source code from below links

* [visualHeatmap.min.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.min.js)
* [visualHeatmap.js](https://raw.githubusercontent.com/nswamy14/visual-heatmap/master/dist/visualHeatmap.js)
* [visualHeatmap.esm.browser.js](https://raw.githubusercontent.com/nswamy14/Visual-Heatmap/master/dist/visualHeatmap.esm.browser.js)

Visual-Heatmap is written in ES6 Modules. To import use below syntax

Importing everthing into namespace
```
import * from 'Visual-Heatmap'
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
Query string which identifies container.

#### Config
Input to the Heatmap layer with below info.

**Size :** Raius of the data point, in pixels.

**Max :** Max data Value for relative pixel grading.

**blurr :**

**gradient :** Color Gradient, array of values with color and offset.

#### instance.renderData()
Accepts array of data points with 'x', 'y' and 'value'.

#### instance.setMax()
To set max data value, for relative calculations.

#### instance.setTranslate()

#### instance.setZoom()

#### instance.setRotationAngle()

#### instance.setSize()

#### instance.setBlurr()

#### instance.setOpacity()

#### instance.clear()




