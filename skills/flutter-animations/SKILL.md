---
name: ckm:flutter-animations
description: Design and implement high-performance, fluid UI animations, custom page route transitions, hero animations, and custom painter transitions in Flutter. Use when building implicit/explicit animations, spring physics simulations, custom builder curves, or interactive canvas overlays.
argument-hint: "[animation, controller, or transition description]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# Flutter Animations Skill

Comprehensive skill for designing, building, and optimizing fluid, high-performance user interface animations, page transitions, and physical simulations in Flutter (Dart).

## Reference

- Flutter Animations Guide: https://docs.flutter.dev/ui/animations
- Implicit Animations: https://docs.flutter.dev/ui/animations/implicit
- Explicit Animations: https://docs.flutter.dev/ui/animations/explicit

## When to Use This Skill

Use when:
- Adding simple UI transitions (implicit animations like fading, resizing, sliding).
- Building complex, custom animated sequences (explicit animations with controllers and custom curves).
- Implementing shared element transitions (Hero animations) across route navigations.
- Designing custom transition routes (custom PageRoute transitions).
- Creating custom canvas-drawn animations (CustomPainter + CustomPaint).
- Adding physics-based animations (springs, drag-and-drop, friction simulations).
- Optimizing widget rebuilds during active animations.

---

## Animation Types in Flutter

### 1. Implicit Animations (Widget-centric)
Implicit animations manage their own animation controller behind the scenes. They are perfect for simple transitions. When a property changes (e.g., width, opacity), the widget automatically animates to the new value.
- **Widgets:** `AnimatedContainer`, `AnimatedOpacity`, `AnimatedPadding`, `AnimatedPositioned`, `AnimatedAlign`, `AnimatedDefaultTextStyle`.
- **How to use:** Simply change the value of a parameter passed to the widget and trigger a rebuild (e.g. `setState()`). The widget handles the easing and duration.

### 2. Explicit Animations (Controller-centric)
Explicit animations require you to manage the timing, controller lifecycle, and state manually. Use these for repeatable, reversable, or complex chained animations.
- **Key Classes:**
  - `AnimationController`: Controls the duration, direction, and playback (forward, reverse, repeat, stop). Needs to be disposed in `dispose()`.
  - `Animatable` / `Tween`: Maps a range of values (e.g., `Color`, `double`, `Offset`) over a linear `0.0` to `1.0` duration.
  - `Curve` / `CurvedAnimation`: Defines non-linear progression rates (e.g., `Curves.easeOutElastic`, `Curves.decelerate`).
  - `AnimatedBuilder`: Separates the animation logic from widget rendering to optimize performance.

---

## Best Practices & Performance Optimizations

### 1. Optimize Rebuilds with `AnimatedBuilder`'s child parameter
When animating a subtree, do not rebuild static widgets. Pass the static part to the `child` parameter of `AnimatedBuilder` so it is built only once:
```dart
AnimatedBuilder(
  animation: _controller,
  child: const ExpensiveStaticWidget(), // Built once
  builder: (context, child) {
    return Transform.scale(
      scale: _controller.value,
      child: child, // Reused and scaled without rebuilding
    );
  },
)
```

### 2. TickerProvider & Lifecycles
- State classes managing an `AnimationController` must mix in `SingleTickerProviderStateMixin` (for a single controller) or `TickerProviderStateMixin` (for multiple controllers).
- **CRITICAL:** Always call `_controller.dispose()` in the state's `dispose()` method to prevent memory and ticker leaks.

### 3. Custom Page Transitions
Implement custom page routing transitions by overriding the transition builder in a `PageRouteBuilder`:
```dart
Route createFadeRoute(Widget page) {
  return PageRouteBuilder(
    pageBuilder: (context, animation, secondaryAnimation) => page,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: animation,
        child: child,
      );
    },
  );
}
```

---

## Code Examples

### 1. Implicit Animation Example (`AnimatedContainer`)
```dart
class AnimatedBox extends StatefulWidget {
  const AnimatedBox({super.key});
  @override
  State<AnimatedBox> createState() => _AnimatedBoxState();
}

class _AnimatedBoxState extends State<AnimatedBox> {
  double _size = 100.0;
  Color _color = Colors.blue;

  void _toggle() {
    setState(() {
      _size = _size == 100.0 ? 200.0 : 100.0;
      _color = _color == Colors.blue ? Colors.amber : Colors.blue;
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _toggle,
      child: AnimatedContainer(
        width: _size,
        height: _size,
        color: _color,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOutQuart,
        child: const Center(child: Text('Tap Me')),
      ),
    );
  }
}
```

### 2. Explicit Animation Example (`AnimationController` + `Tween`)
```dart
class SpinningLogo extends StatefulWidget {
  const SpinningLogo({super.key});
  @override
  State<SpinningLogo> createState() => _SpinningLogoState();
}

class _SpinningLogoState extends State<SpinningLogo> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(); // Loop animation

    _animation = Tween<double>(begin: 0.0, end: 2.0 * math.pi).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose(); // Prevent leaks
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.rotate(
          angle: _animation.value,
          child: const FlutterLogo(size: 100.0),
        );
      },
    );
  }
}
```
