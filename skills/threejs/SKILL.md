---
name: ckm:threejs
description: Create immersive 3D WebGL experiences using Three.js, TresJS, and @tresjs/cientos in Vue/Nuxt. Use when building 3D dioramas, interactive 3D models, camera movements, orbital transitions, lighting systems, procedural meshes, or custom WebGL canvas elements.
argument-hint: "[diorama or scene description]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# Three.js & TresJS WebGL Skill

Comprehensive skill for creating immersive 3D WebGL experiences combining Three.js, TresJS (the Vue-wrapped Three.js engine), and `@tresjs/cientos` helpers in Vue and Nuxt 3.

## Reference

- TresJS Docs: https://tresjs.org/
- Cientos Docs: https://cientos.tresjs.org/
- Three.js Docs: https://threejs.org/docs/

## When to Use This Skill

Use when:
- Building immersive WebGL elements, 3D backgrounds, or dioramas.
- Creating interactive 3D maps, product configurators, or floorplans.
- Implementing camera transitions (e.g., vertical scroll anims, lookAt targets).
- Designing customized shaders or procedural meshes.
- Integrating responsive 3D canvasses with HTML overlays.

## Core Stack

### TresJS Core (`@tresjs/core`)
- Vue component-first wrapper around Three.js.
- Uses declarative templates (e.g. `<TresMesh>` instead of `new THREE.Mesh()`).
- Automatically manages requestAnimationFrame loop via `useLoop`.

### TresJS Cientos (`@tresjs/cientos`)
- Out-of-the-box helper components (OrbitControls, HTML overlays, Sky, Stars, load models).
- `<Html>` component projects normal DOM elements onto 3D coordinates.

### Nuxt Module (`@tresjs/nuxt`)
- Streamlines integration with Nuxt SSR, resolving client-only WebGL execution.

---

## Best Practices & Custom Patterns

### 1. Lighting in Modern Three.js (Physical Correctness)
Modern Three.js enables physical lights by default. Plain values like `intensity="1.0"` can render meshes completely black.
- Always use higher light intensities (e.g., `intensity="15.0"` or `intensity="30.0"` for global directional lights, `2.0` to `5.0` for local pointlights).
- Make sure to enable shadow maps on the canvas: `<TresCanvas shadows ...>` and add `cast-shadow` / `receive-shadow` properties to meshes.

### 2. Camera Positioning & Responsive Offsets
To keep text content readable and prevent 3D objects from overlapping HTML components:
- **Desktop (Split-Screen):** Offset the camera horizontally (e.g., `cameraX = -2.2` and increase distance `cameraZ = 12`) to project the diorama to the right side of the screen.
- **Mobile (Single Column):** Center the camera (`cameraX = 0`, `cameraZ = 14`) to fit portrait mobile viewports.
- Listen to resize events and dynamically compute `cameraX`, `cameraY`, and `cameraZ`.

### 3. Dynamic target tracking (lookAt target)
For vertical navigation scrolling (e.g. elevators):
- Animate the camera's Y position (`cameraY`) and the camera's target lookAt coordinate simultaneously (`lookAtTarget = [0, cameraY, 0]`).
- Do not let the target stay stuck at `[0,0,0]`, otherwise the view will tilt drastically as the camera moves vertically.

### 4. Interactive 3D Pins with HTML Cards
Use the `<Html>` component from `@tresjs/cientos` to overlay HTML on 3D groups.
- Enable `pointer-events: auto` on the HTML container.
- Embed interactive hover states, such as sliding cards that display real project photos or meta-information.

### 5. Memory Management & Cleanups
WebGL resources (geometries, materials, textures) are not automatically garbage collected by the JS engine:
- If dynamically mounting/unmounting Three.js meshes, clean up resources in `onBeforeUnmount`.
- Dispose of objects: `geometry.dispose()`, `material.dispose()`, and `texture.dispose()`.

### 6. Texture Loading in Vue
- Use `TextureLoader` from `three` inside `onMounted` for optimal compatibility with SSR.
- Keep references reactive (`ref<Texture | null>(null)`) and bind them dynamically: `<TresMeshStandardMaterial v-if="texture" :map="texture" />`.

---

## Code Examples

### 1. Basic Scene Setup with OrbitControls
```vue
<template>
  <div class="canvas-container">
    <TresCanvas shadows alpha clear-color="#f6f1ec">
      <TresPerspectiveCamera :position="[-2, 1, 10]" :fov="45" />
      <OrbitControls :enable-zoom="false" :target="[0, 0, 0]" />
      
      <!-- Lights -->
      <TresAmbientLight :intensity="1.5" />
      <TresDirectionalLight 
        :position="[5, 10, 5]" 
        :intensity="15" 
        cast-shadow 
      />

      <!-- Scene Elements -->
      <TresMesh :position="[0, 0, 0]" cast-shadow>
        <TresBoxGeometry :args="[2, 2, 2]" />
        <TresMeshStandardMaterial color="#ebdcd0" :roughness="0.5" />
      </TresMesh>
    </TresCanvas>
  </div>
</template>

<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import { OrbitControls } from '@tresjs/cientos';
</script>
```

### 2. Smooth LERP Animation Loop
To create butter-smooth transitions (like scaling or rotating models):
```typescript
import { ref } from 'vue';
import { useLoop } from '@tresjs/core';

const currentScale = ref(0);
const targetScale = ref(1);

const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

const { onBeforeRender } = useLoop();

onBeforeRender(({ delta }) => {
  // Lerp scale smoothly toward target (multiplied by delta for frame-rate independence)
  currentScale.value = lerp(currentScale.value, targetScale.value, delta * 6);
});
```
