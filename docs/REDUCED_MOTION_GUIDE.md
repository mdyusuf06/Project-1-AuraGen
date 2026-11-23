# Accessible Reduced Motion Fallback Strategies

**Author:** Raksha R. (Senior Frontend Lead)  
**Module:** `frontend/src/animation/`

---

## 1. Operating System Compliance
AuraGen actively monitors the user's `prefers-reduced-motion` media query to provide an accessible experience for vestibular sensitivity:
- On Windows: *Settings -> Accessibility -> Visual effects -> Animation effects (Off)*.
- On macOS: *System Settings -> Accessibility -> Display -> Reduce motion (On)*.

## 2. Safe Variant Reflection via getAccessibleVariant
Dynamic Framer Motion functional variants (such as `stepSlideVariant.initial(direction)`) must not be spread destructively as objects:
```javascript
export function getAccessibleVariant(variant, reducedMotion) {
  if (!reducedMotion) return variant;
  const processProp = (prop) => {
    if (typeof prop === "function") {
      return (custom) => ({ ...prop(custom), x: 0, y: 0, scale: 1, transition: { duration: 0.15 } });
    }
    return { ...prop, x: 0, y: 0, scale: 1, transition: { duration: 0.15 } };
  };
  return {
    initial: processProp(variant.initial),
    animate: processProp(variant.animate),
    exit: processProp(variant.exit)
  };
}
```
All spatial translations are eliminated, falling back to gentle cross-fades.
