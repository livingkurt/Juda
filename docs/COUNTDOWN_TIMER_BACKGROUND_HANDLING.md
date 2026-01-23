# Countdown Timer Background Handling

## Overview

The CountdownTimer component has been enhanced to provide the best possible timer experience within the limitations of web apps on iOS. While web apps cannot run JavaScript in the background like native apps, we've implemented several strategies to mitigate this limitation.

## Features Implemented

### 1. Wake Lock API (Keep Screen Awake)

**What it does:**
- Prevents the phone screen from automatically locking while the timer is running
- Keeps the timer counting down as long as the screen stays on
- User can toggle this feature on/off via the sun icon button

**How it works:**
```javascript
// Request wake lock when timer starts
wakeLockRef.current = await navigator.wakeLock.request("screen");

// Release when timer stops/pauses
await wakeLockRef.current.release();
```

**Limitations:**
- ✅ Timer continues while screen is on
- ❌ Doesn't work if user manually locks the phone
- ❌ Drains battery faster (screen stays on)
- ✅ User can disable if they prefer

**User Control:**
- Sun icon button in timer controls
- Blue = Wake Lock enabled (screen stays awake)
- Gray = Wake Lock disabled (screen can sleep)

### 2. End Time Calculation

**What it does:**
- Stores the exact timestamp when the timer should complete
- When the page becomes visible again, checks if the timer finished while in background
- Syncs elapsed time if timer is still running

**How it works:**
```javascript
// Store end time when timer starts
endTimeRef.current = Date.now() + targetSeconds * 1000;

// When page becomes visible, check if completed
if (now >= endTimeRef.current) {
  // Timer finished - trigger completion
  setElapsedSeconds(targetSeconds);
  playCompletionSound();
  onComplete();
}
```

**Benefits:**
- ✅ Detects if timer finished while away
- ✅ Plays completion sound when you return
- ✅ Triggers onComplete callback
- ✅ Syncs elapsed time accurately

### 3. Page Visibility Detection

**What it does:**
- Monitors when the page becomes hidden (app switch, screen lock)
- Monitors when the page becomes visible again
- Shows warning when timer is running and page goes to background

**How it works:**
```javascript
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Page hidden - show warning
    setShowBackgroundWarning(true);
  } else {
    // Page visible - sync timer state
    syncTimerState();
  }
});
```

**User Experience:**
- ⚠️ Warning banner appears when timer is running and you switch apps
- Message: "Timer may pause if you switch apps or lock your phone"
- User can dismiss the warning by clicking the X

## Technical Implementation

### State Management

```javascript
const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
const [showBackgroundWarning, setShowBackgroundWarning] = useState(false);
const wakeLockRef = useRef(null);
const endTimeRef = useRef(null);
const wasRunningRef = useRef(false);
```

### Key Functions

1. **requestWakeLock()** - Requests screen wake lock from browser
2. **releaseWakeLock()** - Releases wake lock (called on pause/reset)
3. **calculateElapsedFromEndTime()** - Calculates actual elapsed time based on end time
4. **handleVisibilityChange()** - Handles page visibility changes

### Lifecycle

```
Timer Start
  ↓
Request Wake Lock (if enabled)
  ↓
Store End Time (Date.now() + duration)
  ↓
Start Interval Timer
  ↓
[User switches apps]
  ↓
Page Hidden → Show Warning
  ↓
JavaScript Paused (iOS limitation)
  ↓
[User returns to app]
  ↓
Page Visible → Check End Time
  ↓
If (now >= endTime):
  - Set elapsed to target
  - Play completion sound
  - Call onComplete()
Else:
  - Sync elapsed time
  - Continue timer
```

## iOS Web App Limitations

### What Web Apps CANNOT Do:
- ❌ Run JavaScript in background
- ❌ Show live countdown in notifications
- ❌ Play sounds when app is closed
- ❌ Update app badge with remaining time
- ❌ Prevent screen lock if user manually locks phone

### What Native Apps CAN Do:
- ✅ Run timers in background
- ✅ Show live countdown in notifications
- ✅ Play sounds when app is closed
- ✅ Update app badge with remaining time
- ✅ Run even when phone is locked

## User Recommendations

### For Best Timer Experience:

1. **Enable Wake Lock** (sun icon button)
   - Keeps screen on while timer runs
   - Prevents automatic screen lock
   - Timer continues reliably

2. **Keep App in Foreground**
   - Don't switch to other apps during timer
   - Don't lock phone manually
   - Timer will run continuously

3. **If You Must Switch Apps:**
   - Timer will pause (iOS limitation)
   - Return before timer should complete
   - App will detect if timer finished and notify you

4. **Battery Considerations:**
   - Wake Lock drains battery (screen stays on)
   - Disable if battery is low
   - Re-enable when plugged in

## Testing Scenarios

### Scenario 1: Normal Usage (Wake Lock Enabled)
1. Start timer
2. Leave app in foreground
3. Screen stays on
4. Timer completes normally ✅

### Scenario 2: App Switch (Wake Lock Enabled)
1. Start timer
2. Switch to another app
3. Timer pauses (warning shown)
4. Return to app
5. App syncs elapsed time
6. Timer continues from correct position ✅

### Scenario 3: Manual Screen Lock
1. Start timer
2. Manually lock phone
3. Timer pauses (iOS limitation)
4. Unlock phone
5. App detects if timer finished
6. Plays sound if completed ✅

### Scenario 4: Timer Completes While Away
1. Start 30-second timer
2. Switch to another app
3. Wait 35 seconds
4. Return to app
5. App detects timer completed
6. Plays completion sound
7. Calls onComplete() ✅

## Future Enhancements (Potential)

### Service Workers (Limited on iOS)
- Could provide some background capabilities
- iOS Safari has limited Service Worker support
- May not work reliably for timers

### Web Push Notifications
- Could notify when timer completes
- Requires user permission
- Only works if app was recently active

### Progressive Web App (PWA)
- App already has PWA support
- iOS PWA still has same JavaScript limitations
- No additional timer benefits

## Code References

**Main Component:**
- `components/CountdownTimer.jsx`

**Key Sections:**
- Lines 56-70: Wake Lock functions
- Lines 72-78: End time calculation
- Lines 193-213: handleStart with wake lock
- Lines 383-425: Page visibility handling
- Lines 542-556: Wake Lock toggle UI

## Browser Support

| Feature | iOS Safari | Chrome iOS | Notes |
|---------|-----------|------------|-------|
| Wake Lock API | ✅ iOS 16.4+ | ✅ | Requires HTTPS |
| Page Visibility API | ✅ | ✅ | Fully supported |
| End Time Calculation | ✅ | ✅ | Pure JavaScript |
| Background Execution | ❌ | ❌ | iOS limitation |

## Conclusion

While web apps on iOS cannot truly run in the background, this implementation provides:

1. **Reliable timer** when app is in foreground
2. **Screen wake lock** to prevent automatic sleep
3. **Completion detection** when returning to app
4. **User control** over wake lock behavior
5. **Clear warnings** about limitations

This is the best possible experience within web app constraints. For true background timer support, a native iOS app would be required.
