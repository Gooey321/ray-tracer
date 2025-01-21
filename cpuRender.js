// Get functions from other scripts
import { trace, BVHNode, Vector } from "./function.js";

document.body.style.backgroundColor = "#000";

// Get the canvas and context
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

// Scene parameters
const width = 250;
const height = 250;
const focalLength = 100;

// Rendering parameters
const maxSamples = 500;
const samplesPerFrame = 2;

let lastFrameTime = performance.now();
let fps = 0;

// Function to calculate FPS
function calculateFps() {
  const currentTime = performance.now();
  const deltaTime = currentTime - lastFrameTime;
  fps = 1000 / deltaTime;
  lastFrameTime = currentTime;
  return fps.toFixed(1);
}

// Create FPS Display (existing code)
const fpsDisplay = document.createElement("div");
fpsDisplay.id = "fpsDisplay"; // Set ID for styling
fpsDisplay.style.position = "absolute";
fpsDisplay.style.top = "10px";
fpsDisplay.style.left = "10px";
fpsDisplay.style.color = "white";
fpsDisplay.style.backgroundColor = "rgba(0,0,0,0.5)";
fpsDisplay.style.padding = "5px";
fpsDisplay.style.fontFamily = "monospace";
fpsDisplay.style.zIndex = "1000"; // Ensure it's on top
document.querySelector("#content").appendChild(fpsDisplay); // Append to content div

// Select the console div
const consoleDiv = document.querySelector("#console");

const lightXSlider = document.getElementById("lightX");
const lightYSlider = document.getElementById("lightY");
const lightZSlider = document.getElementById("lightZ");

// Function to update light source position
function updateLightPosition() {
  const light = objects.find(
    (obj) => obj.shape === "sphere" && obj.emission.x > 0
  );
  if (light) {
    light.position.x = parseFloat(lightXSlider.value);
    light.position.y = parseFloat(lightYSlider.value);
    light.position.z = parseFloat(lightZSlider.value);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Reset rendering state
    currentSamples = 0;

    // Reset buffers
    for (let i = 0; i < accumulatedBuffer.length; i++) {
      accumulatedBuffer[i] = 0;
      pixelBuffer[i] = 0;
    }

    // Rebuild BVH
    bvh = new BVHNode(objects);

    // Start fresh render
    startRender();
  }
}

function updateSliderValue(slider, valueSpan) {
  document.getElementById(valueSpan).textContent = slider.value;
}

// Add event listeners
lightXSlider.addEventListener("input", () => {
  updateSliderValue(lightXSlider, "lightXValue");
  updateLightPosition();
});

lightYSlider.addEventListener("input", () => {
  updateSliderValue(lightYSlider, "lightYValue");
  updateLightPosition();
});

lightZSlider.addEventListener("input", () => {
  updateSliderValue(lightZSlider, "lightZValue");
  updateLightPosition();
});

// Initialize slider values to match initial light position
lightXSlider.value = "0";
lightYSlider.value = "-40";
lightZSlider.value = "40";

const MAX_CONSOLE_MESSAGES = 15;
let consoleMessages = [];

// Function to log messages to the console div
function logToConsole(message) {
  // Add new message
  consoleMessages.push(message);

  // Remove oldest if over limit
  if (consoleMessages.length > MAX_CONSOLE_MESSAGES) {
    consoleMessages.shift();
  }

  // Clear console and add all messages
  consoleDiv.innerHTML = "";
  consoleMessages.forEach((msg) => {
    const p = document.createElement("p");
    p.textContent = msg;
    p.style.margin = "2px 0";
    consoleDiv.appendChild(p);
  });

  // Scroll to bottom
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

let currentSamples = 0;
const accumulatedBuffer = new Float32Array(width * height * 3);
const pixelBuffer = new Float32Array(width * height * 3);

let startTime; // Variable to store the start time

function setPixel(x, y, color) {
  const index = (y * width + x) * 3;
  pixelBuffer[index] = Math.max(0, Math.min(1, isNaN(color.x) ? 0 : color.x));
  pixelBuffer[index + 1] = Math.min(color.y, 1.0);
  pixelBuffer[index + 2] = Math.min(color.z, 1.0);
}

function toneMap(color) {
  // Reinhard tone mapping
  return new Vector(
    color.x / (1 + color.x),
    color.y / (1 + color.y),
    color.z / (1 + color.z)
  );
}

const objects = [
  {
    shape: "sphere",
    position: new Vector(0, 1000, 0),
    radius: 990,
    emission: new Vector(0, 0, 0),
    reflectivity: new Vector(1, 0, 0), // Red floor
    roughness: 3,
  },
  {
    shape: "sphere",
    position: new Vector(0, -40, 40),
    radius: 5,
    emission: new Vector(15, 15, 15),
    reflectivity: new Vector(1, 1, 1), // Light source
    roughness: 3,
  },
  {
    shape: "sphere",
    position: new Vector(15, 2, 20),
    radius: 3,
    emission: new Vector(0, 0, 0),
    reflectivity: new Vector(0, 0, 0), // Reflective sphere
    roughness: 0,
  },
  {
    shape: "sphere",
    position: new Vector(0, 2, 20),
    radius: 3,
    emission: new Vector(0, 0, 0),
    reflectivity: new Vector(0, 1, 0), // Green sphere
    roughness: 5,
  },
  {
    shape: "sphere",
    position: new Vector(-15, 2, 20),
    radius: 3,
    emission: new Vector(0, 0, 0),
    reflectivity: new Vector(0, 0, 1), // Blue sphere
    roughness: 3,
  },
];

const bvh = new BVHNode(objects);

function bilateralFilter(buffer, width, height, spatialSigma, rangeSigma) {
  const result = new Float32Array(buffer.length);
  const radius = Math.ceil(spatialSigma * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = (y * width + x) * 3;
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        totalWeight = 0;

      const centerR = buffer[centerIdx];
      const centerG = buffer[centerIdx + 1];
      const centerB = buffer[centerIdx + 2];

      for (
        let ny = Math.max(0, y - radius);
        ny < Math.min(height, y + radius + 1);
        ny++
      ) {
        for (
          let nx = Math.max(0, x - radius);
          nx < Math.min(width, x + radius + 1);
          nx++
        ) {
          const curIdx = (ny * width + nx) * 3;

          const spatialDist =
            ((nx - x) ** 2 + (ny - y) ** 2) / (2 * spatialSigma ** 2);
          const spatialWeight = Math.exp(-spatialDist);

          const intensityDist =
            ((buffer[curIdx] - centerR) ** 2 +
              (buffer[curIdx + 1] - centerG) ** 2 +
              (buffer[curIdx + 2] - centerB) ** 2) /
            (2 * rangeSigma ** 2);
          const rangeWeight = Math.exp(-intensityDist);

          const weight = spatialWeight * rangeWeight;

          sumR += buffer[curIdx] * weight;
          sumG += buffer[curIdx + 1] * weight;
          sumB += buffer[curIdx + 2] * weight;
          totalWeight += weight;
        }
      }

      result[centerIdx] = sumR / totalWeight;
      result[centerIdx + 1] = sumG / totalWeight;
      result[centerIdx + 2] = sumB / totalWeight;
    }
  }

  return result;
}

function renderProgressive() {
  const fpsValue = calculateFps();
  fpsDisplay.textContent = `FPS: ${fpsValue}`;

  const frameStartTime = performance.now();
  if (currentSamples >= maxSamples) {
    const totalTime = performance.now() - startTime;
    const totalSeconds = Math.floor(totalTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    console.log(
      `Total rendering time: ${hours} hours, ${minutes} minutes, ${seconds} seconds`
    );
    logToConsole(
      `Rendering complete. Total time: ${hours}h ${minutes}m ${seconds}s`
    );
    return;
  }

  const varianceBuffer = calculateVariance(pixelBuffer, width, height);
  const maxSamplesPerPixel = 1000;
  const BRIGHTNESS_THRESHOLD = 0.95;

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const index = (j * width + i) * 3;

      // Skip already bright pixels
      const currentBrightness = Math.max(
        pixelBuffer[index],
        pixelBuffer[index + 1],
        pixelBuffer[index + 2]
      );
      if (currentBrightness > BRIGHTNESS_THRESHOLD) {
        continue;
      }

      const variance = varianceBuffer[j * width + i];
      const samplesForPixel = Math.min(
        maxSamplesPerPixel,
        Math.ceil(samplesPerFrame * (variance + 1))
      );

      for (let s = 0; s < samplesForPixel; s++) {
        const x = i - width / 2 + Math.random() * 0.99;
        const y = j - height / 2 + Math.random() * 0.99;

        const direction = Vector.normalize(new Vector(x, y, focalLength));

        // Adaptive bounce depth
        const bounceDepth = currentSamples < 10 ? 4 : 8;
        let color = trace(new Vector(0, 0, 0), direction, bounceDepth, bvh);

        accumulatedBuffer[index] += color.x;
        accumulatedBuffer[index + 1] += color.y;
        accumulatedBuffer[index + 2] += color.z;
      }

      const scale = 1.0 / (currentSamples + 1);
      const color = new Vector(
        accumulatedBuffer[index] * scale,
        accumulatedBuffer[index + 1] * scale,
        accumulatedBuffer[index + 2] * scale
      );

      const toneMappedColor = toneMap(color);

      setPixel(i, j, toneMappedColor);
    }
  }

  // Apply denoising after initial samples
  if (currentSamples > 1) {
    let denoisedBuffer = pixelBuffer;

    // Multiple denoising passes with different parameters
    denoisedBuffer = bilateralFilter(denoisedBuffer, width, height, 2.5, 0.1);
    denoisedBuffer = bilateralFilter(denoisedBuffer, width, height, 1.5, 0.2);

    for (let i = 0; i < pixelBuffer.length; i++) {
      pixelBuffer[i] = denoisedBuffer[i];
    }
  }

  // Pixel filtering pass
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 3;
      const threshold = 5.0; // Adjust this value to control sensitivity

      // Check if pixel is significantly brighter than neighbors
      let isFirefly = false;
      for (let c = 0; c < 3; c++) {
        const center = pixelBuffer[idx + c];
        const up = pixelBuffer[((y - 1) * width + x) * 3 + c];
        const down = pixelBuffer[((y + 1) * width + x) * 3 + c];
        const left = pixelBuffer[(y * width + x - 1) * 3 + c];
        const right = pixelBuffer[(y * width + x + 1) * 3 + c];

        if (center > (threshold * (up + down + left + right)) / 4) {
          isFirefly = true;
          break;
        }
      }

      // Replace firefly with average of neighbors
      if (isFirefly) {
        for (let c = 0; c < 3; c++) {
          const up = pixelBuffer[((y - 1) * width + x) * 3 + c];
          const down = pixelBuffer[((y + 1) * width + x) * 3 + c];
          const left = pixelBuffer[(y * width + x - 1) * 3 + c];
          const right = pixelBuffer[(y * width + x + 1) * 3 + c];
          pixelBuffer[idx + c] = (up + down + left + right) / 4;
        }
      }
    }
  }

  // Update canvas
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const pixelIndex = i * 3;
    const imageIndex = i * 4;
    data[imageIndex] = Math.min(255, pixelBuffer[pixelIndex] * 255);
    data[imageIndex + 1] = Math.min(255, pixelBuffer[pixelIndex + 1] * 255);
    data[imageIndex + 2] = Math.min(255, pixelBuffer[pixelIndex + 2] * 255);
    data[imageIndex + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  currentSamples++;
  requestAnimationFrame(renderProgressive);

  const frameEndTime = performance.now();
  const frameTime = (frameEndTime - frameStartTime).toFixed(2);
  console.log(`Render time for frame ${currentSamples}: ${frameTime} ms`);
  logToConsole(`Frame ${currentSamples}: ${frameTime} ms`);
}

function calculateVariance(buffer, width, height) {
  const varianceBuffer = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3;
      const r = buffer[index];
      const g = buffer[index + 1];
      const b = buffer[index + 2];

      const mean = (r + g + b) / 3;
      const variance =
        ((r - mean) ** 2 + (g - mean) ** 2 + (b - mean) ** 2) / 3;

      varianceBuffer[y * width + x] = variance;
    }
  }

  return varianceBuffer;
}

function startRender() {
  currentSamples = 0;
  startTime = performance.now(); // Record the start time
  for (let i = 0; i < accumulatedBuffer.length; i++) {
    accumulatedBuffer[i] = 0;
    pixelBuffer[i] = 0;
  }
  renderProgressive();
}

// Start rendering after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  startRender();
});
