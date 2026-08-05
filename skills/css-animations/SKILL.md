---
name: ckm:css-animations
description: Design and implement high-performance, responsive CSS transitions and keyframe animations. Use when building hover micro-interactions, fade/slide entrance sequences, skeleton shimmer animations, custom loading spinners, or responsive motion media queries.
argument-hint: "[animation, keyframe, or transition description]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# CSS Animations Skill

Comprehensive skill for designing, structuring, and optimizing CSS transitions, `@keyframes` animations, and interactive motion patterns in modern web applications.

## Reference

- MDN CSS transitions: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions
- MDN CSS animations: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations
- CSS Easing Curves: https://easings.net/

## When to Use This Skill

Use when:
- Creating interactive hover, active, focus, and state micro-animations.
- Designing page layout entrances (fade, slide, scale, skeleton shimmer).
- Implementing infinite loops (spinners, pulse rings, bouncing indicators).
- Optimizing web animation pipelines (avoiding layout shifts and CPU repaints).
- Implementing responsive motion patterns and handling accessibility constraints.

---

## Easing & Timing Functions

Never use browser defaults like `linear` or `ease` for premium interfaces. Utilize custom `cubic-bezier` timing curves to give animations a natural, physical feel:
- **Standard/Main Easing:** `cubic-bezier(0.25, 1, 0.5, 1)` (Out-Quart) or `cubic-bezier(0.4, 0, 0.2, 1)` (Swift-Out). Great for generic card movements, menus, and text.
- **Deceleration/Entrance:** `cubic-bezier(0.16, 1, 0.3, 1)` (Out-Quint) or `cubic-bezier(0, 0, 0.2, 1)`. Perfect for items sliding onto the screen.
- **tactile/Elastic:** `cubic-bezier(0.34, 1.56, 0.64, 1)`. Adds a slight bounce effect on scale hovers.

Define these globally as tokens:
```css
:root {
  --ease-main: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-elastic: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  --transition-fast: 0.2s var(--ease-main);
  --transition-normal: 0.4s var(--ease-main);
  --transition-slow: 0.8s var(--ease-out);
}
```

---

## Performance Optimizations

To keep animations running at 60+ FPS on mobile and desktop:
- **Animate only Compositor Properties:** Only animate properties that do not trigger layout reflows or repaints:
  - `transform` (translates, scales, rotations).
  - `opacity`.
- **Avoid animating layout properties:** Do not animate `width`, `height`, `margin`, `padding`, `top`, `left`, `right`, `bottom`, `flex-basis`, or `border-width`. These force the browser to recalculate the document layout on every frame.
- **Promote Layering:** Use `will-change: transform, opacity;` on elements that animate frequently to let the browser pre-compile the rendering layer on the GPU.

---

## Core Animation Patterns

### 1. Slide & Fade Entrance
```css
.card-entrance {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}
.card-entrance.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 2. Underline Hover Wipe (Tactile Link)
A premium underline effect that sweeps in from left to right and wipes away to the right on hover:
```css
.u-hover {
  position: relative;
  text-decoration: none;
}
.u-hover::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 1px;
  bottom: -2px;
  left: 0;
  background-color: currentColor;
  transform: scaleX(0);
  transform-origin: bottom right;
  transition: transform 0.35s var(--ease-main);
}
.u-hover:hover::after {
  transform: scaleX(1);
  transform-origin: bottom left;
}
```

### 3. Infinite Rotating Spinner
```css
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 4. Skeleton Shimmer Loading (Background Gradient)
```css
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #ede9e6 25%,
    #f3ede9 50%,
    #ede9e6 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite var(--ease-main);
}
@keyframes shimmer {
  to {
    background-position-x: -200%;
  }
}
```

---

## Motion Accessibility

Always respect user preferences for reduced motion. Include a media query in your global stylesheets to disable or simplify animations for users with vestibular motion sensitivities:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-delay: -1ms !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }
}
```
