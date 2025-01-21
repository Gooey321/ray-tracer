# Ray Tracer

## Introduction

This project is a simple CPU-based ray tracer built in JavaScript. (I couldn't get it running on the gpu). I've done my best to optimise it, however there is only so much you can do on the cpu. It renders 3D scenes by simulating the way light interacts with objects. The ray tracer uses a bounding volume hierarchy (BVH) for efficient intersection testing and supports various features such as reflections, ambient lighting, and adaptive sampling.

## Features

- **Real-time Rendering**: Continuously updates the scene to reflect changes in light position and object properties.
- **Bounding Volume Hierarchy (BVH)**: Efficiently handles intersection tests for complex scenes.
- **Reflections**: Simulates reflective surfaces for realistic rendering.
- **Ambient Lighting**: Adds ambient light to the scene for better illumination.
- **Adaptive Sampling**: Adjusts the number of samples per pixel based on variance to optimize rendering quality and performance.
- **Denoising**: Applies bilateral filtering to reduce noise in the rendered image.
- **Firefly Removal**: Detects and removes bright pixels (fireflies) to improve image quality.
- **FPS Display**: Shows the current frames per second (FPS) for performance monitoring.
- **Light Source Controls**: Provides sliders to adjust the position of the light source in real-time.

## Usage

1. Head to https://glooey.me/assets/ray-tracer/index.html.
2. The ray tracer will start rendering the scene automatically.
3. At the current sample settings (500 samples at 2 samples per frame) it takes about 2 minutes and 30 seconds (not accurately representative of your time. It depends on the speed of the cpu).

## Controls

- **Light X**: Adjust the X position of the light source.
- **Light Y**: Adjust the Y position of the light source.
- **Light Z**: Adjust the Z position of the light source.

## File Structure

- `index.html`: The main HTML file that sets up the page layout and includes the necessary scripts and styles.
- `style.css`: The CSS file that styles the page and the controls.
- `cpuRender.js`: The main JavaScript file that handles rendering, light position updates, and user interactions.
- `function.js`: Contains utility functions for vector operations, intersection tests, and BVH construction.

## License

This project is licensed under the MIT License.
