# AuraGen Engineering & Evaluation Troubleshooting Guide

**Author:** Raksha R. (Senior Frontend Lead)  
**Applies to:** Monorepo (`backend`, `frontend`, WebSocket Protocol)

---

## 1. Quick Diagnostic Checklist

If experiencing unexpected behavior during a demonstration or testing run, verify these 5 health checks:

| Check | Expected Value | Diagnostic Command |
| :--- | :--- | :--- |
| **Backend HTTP Health** | `HTTP 200 OK` | `curl.exe -s http://localhost:8080/health` |
| **Backend Port** | `8080` LISTENING | `netstat -ano \| findstr "8080"` |
| **Frontend Next.js** | `HTTP 200 OK` | `curl.exe -s -I http://localhost:3000` |
| **Frontend Port** | `3000` LISTENING | `netstat -ano \| findstr "3000"` |
| **WebSocket Connection** | `WS Connected` (Green) | Inspect HUD banner in browser header |

---

## 2. Port Collisions (Port 3000 or 8080 In Use)

### Symptom
Next.js fails to start on port 3000 (`EADDRINUSE: address already in use :::3000`) or chooses an unexpected fallback port like `3001`. Or the backend crashes on startup with `EADDRINUSE: address already in use :::8080`.

### Solution (Windows PowerShell)
```powershell
# 1. Identify which Process ID (PID) is listening on port 3000 or 8080
Get-NetTCPConnection -LocalPort 3000, 8080 -ErrorAction SilentlyContinue | Select-Object OwningProcess, LocalPort

# 2. Terminate the blocking process by PID (e.g. PID 18540)
Stop-Process -Id <PID> -Force

# 3. Verify ports are completely free
netstat -ano | findstr "3000 8080"
```

### Solution (macOS / Linux / Bash)
```bash
# Identify and terminate process on port 3000 or 8080
lsof -ti:3000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

---

## 3. WebSocket Disconnection & Reconnection Issues

### Symptom
The Telemetry HUD header displays `WS Disconnected` (amber pulse) or `WS Reconnecting...`, and cognitive load metrics fail to stream to the backend terminal.

### Root Causes & Fixes
1. **Backend Server Is Not Running:**
   - Verify the backend is running via `cd backend && npm run dev`.
   - Confirm terminal output: `[AuraGen WS] Server listening on ws://localhost:8080`.
2. **Environment URL Mismatch:**
   - Verify `frontend/.env.local` contains:
     ```bash
     NEXT_PUBLIC_WS_URL=ws://localhost:8080
     ```
   - If using remote or Docker deployments, ensure `ws://` protocol matches host network routing.
3. **Exponential Backoff Active:**
   - The underlying `wsService.js` retries connection with exponential backoff (`1000ms`, `2000ms`, `4000ms`, up to `30000ms`).
   - Starting the backend server will automatically trigger successful reconnection on the next retry interval.

---

## 4. Next.js 15.5 Webpack Cache & Stale Build Issues

### Symptom
Changes made to files do not reflect in the browser, or the browser shows a stale runtime error after modifying dynamic import variants.

### Root Cause
Next.js caches build chunks in `frontend/.next/`. Long-running dev servers can retain stale memory references across branch switches.

### Solution
```powershell
# Stop running Next.js dev server
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Clear Next.js cache directory
Remove-Item -Recurse -Force frontend\.next -ErrorAction SilentlyContinue

# Restart fresh dev server
npm --prefix frontend run dev
```

---

## 5. Framer Motion Dynamic Variant Function Errors

### Symptom
Browser console throws `Runtime TypeError: a[d] is not a function` during step navigation or morph transitions.

### Root Cause
In Framer Motion, dynamic variants (such as `stepSlideVariant`) use functions for parameterized transitions:
```javascript
export const stepSlideVariant = {
  initial: (direction) => ({ x: direction > 0 ? 36 : -36, opacity: 0 }),
  exit: (direction) => ({ x: direction > 0 ? -36 : 36, opacity: 0 })
};
```
If an accessibility wrapper or utility applies destructive object spreading (`{ ...stepSlideVariant.initial }`), it converts the function into an empty object `{}`. When Framer Motion subsequently invokes `a[d](custom)`, a `TypeError` occurs.

### Fix Implemented in AuraGen
In [frontend/src/animation/variants.js](file:///c:/Users/Admin/OneDrive/Desktop/Project-1-AuraGen/frontend/src/animation/variants.js), `getAccessibleVariant` uses function reflection:
```javascript
const processVariantProp = (prop) => {
  if (typeof prop === "function") {
    return (custom) => ({
      ...prop(custom),
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: 0.15 }
    });
  }
  // Standard object variant handling
};
```
Always use `getAccessibleVariant(variant, reducedMotion)` to safely adjust animations for accessibility.

---

## 6. Accessibility & Reduced Motion Testing

### Symptom
Animations do not appear when running the application on certain systems or accessibility modes.

### Diagnosis
AuraGen strictly respects operating system accessibility preferences (`prefers-reduced-motion`).
- On Windows: *Settings $\to$ Accessibility $\to$ Visual effects $\to$ Animation effects (Off)*.
- On macOS: *System Settings $\to$ Accessibility $\to$ Display $\to$ Reduce motion (On)*.

### Expected Behavior Under Reduced Motion
When reduced motion is enabled:
- Morph transitions use smooth opacity fades without spatial translations (`x`, `y` zeroed).
- Stepper slide-ins do not animate across the horizontal axis.
- Shimmer skeleton uses high-contrast static states.
- Cognitive load score transitions remain fully legible.

---

## 7. Test Suite Execution & Typeless Module Warnings

### Symptom
Running `npm test` prints:
```text
(node:15156) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file ... is not specified
```

### Explanation
This is an informational warning emitted by Node.js when ES module syntax (`import`/`export`) is used inside files ending in `.js` within a package whose `package.json` omits `"type": "module"`. Node.js automatically detects the ES syntax, reparses the module, and executes all tests with 100% fidelity. All 49 test cases pass cleanly.
