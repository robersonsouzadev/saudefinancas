---
name: ckm:animation-designer
description: Design and implement high-performance, fluid, and premium web animations, micro-interactions, page transitions, and WebGL animations. Use when adding hover effects, slide transitions, keyframe animations, cubic-bezier timing curves, or Three.js LERP animations.
argument-hint: "[animation or interaction description]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# Animation Designer Skill

Comprehensive skill for designing, choreographing, and implementing premium, high-performance animations, page transitions, and micro-interactions in Vue, Nuxt 3, CSS, and WebGL.

## Reference

- Vue Transitions: https://vuejs.org/guide/built-ins/transition.html
- MDN CSS transitions: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions
- CSS Easing Curves: https://easings.net/

## When to Use This Skill

Use when:
- Designing fluid UI and page-to-page transition states.
- Implementing micro-animations for interactive elements (hover, active, focus).
- Building scroll-linked or viewport-triggered animations.
- Choreographing entrance loader and pre-loading animations.
- Implementing smooth camera and object state interpolations in 3D WebGL environments.
- Optimizing animations for performance and rendering smoothness (60+ FPS).

## Core Principles

### 1. High-Performance rendering (GPU Acceleration)
Animations must run at 60fps to feel premium.
- Only animate properties that do not trigger layout recalculations (reflows) or repaints.
- Use `transform` (translate, scale, rotate) and `opacity`. Avoid animating `width`, `height`, `margin`, `top`, or `left`.
- Utilize `will-change: transform, opacity` selectively on frequently animated elements to promote them to their own compositor layer.

### 2. Premium Easing & Easing Variables
Never use default browser easings like `linear` or standard `ease`. Use custom `cubic-bezier` curves:
- **Main/Standard Easing:** `cubic-bezier(0.25, 1, 0.5, 1)` (out-quart) or `cubic-bezier(0.4, 0, 0.2, 1)` (standard/swift-out).
- **Deceleration/Entrance:** `cubic-bezier(0, 0, 0.2, 1)` (glide-out).
- **Acceleration/Exit:** `cubic-bezier(0.4, 0, 1, 1)` (swift-in).
- Define these globally in your design system's CSS variables:
  ```css
  :root {
    --ease-main: cubic-bezier(0.25, 1, 0.5, 1);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  }
  ```

### 3. Micro-Interactions (Hover/Active)
- Interactive links should use elegant animations like background wipe underlines (`.u-hover`) that slide in from one side and slide out to the other.
- Buttons should feel tactile, scaling down slightly when active (`:active { transform: scale(0.97); }`).

---

## Animation Implementations

### 1. Vue/Nuxt Page Transitions
Use Vue's built-in `<Transition>` component for component entries or page routing.
Configure page transitions globally in `nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  app: {
    pageTransition: { name: 'page', mode: 'out-in' }
  }
})
```
Define the corresponding styles in your global CSS:
```css
.page-enter-active,
.page-leave-active {
  transition: opacity 0.5s var(--ease-main), transform 0.5s var(--ease-main);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(15px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}
```

### 2. Pre-Loader Split Transition (Masking)
For loading animations that open like vertical curtains:
```css
.loader-curtain {
  position: fixed;
  inset: 0;
  background-color: var(--color-bg);
  z-index: 999;
  transition: transform 0.8s cubic-bezier(0.76, 0, 0.24, 1);
}
/* Slide curtain up out of view when loaded */
.loader-curtain.is-loaded {
  transform: translateY(-100%);
}
```

### 3. WebGL LERP Animation (Three.js/TresJS)
For smooth transitions in 3D camera coordinates or scale states:
```typescript
import { ref } from 'vue';
import { useLoop } from '@tresjs/core';

const currentVal = ref(0);
const targetVal = ref(1);

const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

const { onBeforeRender } = useLoop();

onBeforeRender(({ delta }) => {
  // Delta-based interpolation ensures consistent animation speed across different screen refresh rates (60Hz, 120Hz, etc.)
  currentVal.value = lerp(currentVal.value, targetVal.value, delta * 5);
});
```
