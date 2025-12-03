# shadowcalculatordotcom

Shadow Calculator is an educational web app hosted on [ShadowCalculator.com](https://ShadowCalculator.com/) that visualizes how shadows change
with date, time, latitude, and object height.

- Live 3D visualization using [Three.js](https://threejs.org/)
- Solar position from [SunCalc](https://github.com/mourner/suncalc)
- Supports human and simple garden-object heights
- Shows the actual trig used to compute shadow length

## How it works

For a given location, date, and time:

1. SunCalc provides the solar altitude angle `α` and azimuth.
2. The app uses the basic geometry of a right triangle:

   \[
   \tan(α) = \frac{H}{L} \Rightarrow L = \frac{H}{\tan(α)}
   \]

   where:
   - `H` = object height
   - `L` = shadow length on flat ground

3. A simple 3D model of the human/object is projected along the sun direction
   onto a flat plane to form the shadow polygon.

## Running locally

This is a static site. To run it locally:

1. Clone or download this repository.
2. Open `index.html` in a modern browser, or serve it with a simple HTTP server:

   ```bash
   python -m http.server 8000

3. Visit http://localhost:8000
