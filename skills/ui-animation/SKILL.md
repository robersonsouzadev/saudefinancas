---
name: ckm:ui-animation
description: Design and implement intuitive, meaningful, and responsive user interface animations and choreographies. Use when animating accordions, modal popups, sliding sidebar drawers, tabs, dynamic list layouts, page transitions, or micro-interactions.
argument-hint: "[ui element or animation sequence]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# UI Animation Skill

Comprehensive skill for designing, choreographing, and building intuitive, meaningful User Interface (UI) animations, interactive components, overlays, and layout transitions.

## Reference

- Material Design Motion: https://m2.material.io/design/motion/
- Web.dev UI Animation Guide: https://web.dev/animations-guide/
- CSS Easing Curves: https://easings.net/

## When to Use This Skill

Use when:
- Designing modal overlays, dialogs, popovers, or sliding aside drawers.
- Animating collapsible components like accordions, menus, or dropdowns.
- Building tab components with sliding highlight indicators.
- Animating dynamic lists (adding, removing, or re-ordering list items).
- Setting up micro-interactions for input fields, switches, and buttons.
- Choreographing entrance animations for sequential content grids.

---

## Core Animation Patterns for UI Components

### 1. Sliding Aside Drawers / Sidebar Modals
Sidebars should slide out from the screen edges using an ultra-smooth deceleration curve.
- **Direction:** Slide from the right/left using `transform: translateX()`.
- **CSS Implementation:**
  ```css
  .aside-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 450px;
    height: 100%;
    transform: translateX(100%);
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .aside-panel.is-open {
    transform: translateX(0);
  }
  ```

### 2. Collapsible Accordions (Smooth Height)
To animate a section expanding or collapsing when the height is unknown (`height: auto` cannot be transitioned directly in standard CSS):
- **Technique:** Transition `grid-template-rows` or `max-height`.
- **Grid-Rows CSS Pattern:**
  ```css
  .accordion-content {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.4s var(--ease-main);
  }
  .accordion-content.is-expanded {
    grid-template-rows: 1fr;
  }
  .accordion-inner {
    overflow: hidden;
  }
  ```

### 3. Sliding Tab Highlight
Instead of fading active tabs, animate a background highlight capsule that slides horizontally behind the active text:
- **Concept:** Track the active tab's width and offset left using JavaScript, then apply them to a absolute-positioned capsule.
- **Vue Implementation:**
  ```vue
  <template>
    <div class="tabs-container">
      <div class="tab-pill-bg" :style="pillStyle"></div>
      <button 
        v-for="(tab, idx) in tabs" 
        :key="tab" 
        ref="tabRefs" 
        @click="selectTab(idx)"
      >
        {{ tab }}
      </button>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  const tabRefs = ref([]);
  const activeIdx = ref(0);
  
  const pillStyle = computed(() => {
    const activeEl = tabRefs.value[activeIdx.value];
    if (!activeEl) return { width: 0, left: 0 };
    return {
      width: `${activeEl.offsetWidth}px`,
      left: `${activeEl.offsetLeft}px`
    };
  });
  </script>
  ```

### 4. Interactive Tactile Modals (Scale + Fade)
A premium modal popup scales up slightly while fading in:
- **CSS Pattern:**
  ```css
  .modal-overlay {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s var(--ease-main);
  }
  .modal-overlay.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  .modal-card {
    transform: scale(0.95);
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* slight elastic bounce */
  }
  .modal-overlay.is-open .modal-card {
    transform: scale(1);
  }
  ```

---

## Choreography Guidelines

### 1. Durations based on Size and Distance
- **Small elements (icons, switches, toggles):** 100ms – 200ms. Keep it snappy.
- **Medium elements (dropdowns, accordions, tabs):** 200ms – 300ms.
- **Large elements (screen slide-ins, fullscreen modals, page transitions):** 300ms – 600ms.

### 2. Staggered Grid/List Entrances
Do not animate a whole grid of elements simultaneously. Stagger their entrance animations using sequential animation delays:
- **Vue/CSS Stagger Pattern:**
  ```vue
  <div 
    v-for="(item, index) in items" 
    :key="item.id"
    class="stagger-item"
    :style="{ animationDelay: `${index * 80}ms` }"
  >
    {{ item.name }}
  </div>
  ```
  ```css
  .stagger-item {
    animation: fade-slide-in 0.6s var(--ease-main) forwards;
    opacity: 0;
  }
  @keyframes fade-slide-in {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  ```
