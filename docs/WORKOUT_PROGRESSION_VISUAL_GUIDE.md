# Workout Weekly Progression - Visual Guide

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Workout Builder                                                  [X]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Workout Name: [My 5-Week Program                            ]      │
│                                                                     │
│ Number of Weeks: [5]                                               │
│ ↑ Controls weekly progression for all exercises                    │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ > Workout                                        [Delete]    │   │
│ │   ┌─────────────────────────────────────────────────────┐   │   │
│ │   │ > Monday - Leg                          M [Delete]  │   │   │
│ │   │   ┌─────────────────────────────────────────────┐   │   │   │
│ │   │   │ Exercise: [Single Leg Box Squat]            │   │   │   │
│ │   │   │ Type: [Reps ▼] Sets: [3] Target: [13] [Del]│   │   │   │
│ │   │   │                                             │   │   │   │
│ │   │   │ Weekly Progression:                         │   │   │   │
│ │   │   │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│   │   │   │
│ │   │   │ │Week 1│ │Week 2│ │Week 3│ │Week 4│ │Week 5││   │   │   │
│ │   │   │ │      │ │      │ │      │ │ BLUE │ │ORANGE││   │   │   │
│ │   │   │ │ [10] │ │ [12] │ │ [14] │ │ [8]  │ │ [ ]  ││   │   │   │
│ │   │   │ │      │ │      │ │      │ │      │ │      ││   │   │   │
│ │   │   │ │[    ]│ │[    ]│ │[    ]│ │[Deld]│ │[Test]││   │   │   │
│ │   │   │ │[    ]│ │[    ]│ │[    ]│ │[    ]│ │[    ]││   │   │   │
│ │   │   │ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘│   │   │   │
│ │   │   └─────────────────────────────────────────────┘   │   │   │
│ │   └─────────────────────────────────────────────────────┘   │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                     [Cancel]  [Save Workout]
```

## Week Card States

### Normal Week

```
┌──────────┐
│ Week 1   │  ← Week number
│          │
│  [12]    │  ← Target value input
│          │
│[Deload]  │  ← Inactive toggle (gray)
│[Test]    │  ← Inactive toggle (gray)
└──────────┘
```

### Deload Week (Blue)

```
┌──────────┐
│ Week 4   │
│ ░░░░░░░░ │  ← Blue background (info.50)
│  [8]     │  ← Lower target value
│ ░░░░░░░░ │
│[Deload]  │  ← Active (blue)
│[Test]    │  ← Inactive (grayed out)
└──────────┘
```

### Test Week (Orange)

```
┌──────────┐
│ Week 5   │
│ ▓▓▓▓▓▓▓▓ │  ← Orange background (warning.50)
│  [ ]     │  ← Empty (user will test max)
│ ▓▓▓▓▓▓▓▓ │
│[Deload]  │  ← Inactive (grayed out)
│[Test]    │  ← Active (orange)
└──────────┘
```

## Example Progression Patterns

### Linear Progression

```
Week 1: 10 reps
Week 2: 12 reps  (+2)
Week 3: 14 reps  (+2)
Week 4: 16 reps  (+2)
Week 5: 18 reps  (+2)
```

### Wave Loading with Deload

```
Week 1: 10 reps  (Build)
Week 2: 12 reps  (Build)
Week 3: 14 reps  (Peak)
Week 4: 8 reps   (Deload - Recovery)
Week 5: Test     (Max Effort)
```

### Block Periodization

```
Week 1-2: 12 reps  (Hypertrophy)
Week 3-4: 6 reps   (Strength)
Week 5:   3 reps   (Power/Test)
```

## Workout Execution View

When the user opens the workout to execute it:

```
┌─────────────────────────────────────────────────────────────┐
│ Single Leg Box Squat                                        │
│ 3 x 14 reps                    ← Shows Week 3 target       │
│                                                             │
│ Set 1  [✓]  [14]  ← Checkbox + actual value input         │
│ Set 2  [ ]  [  ]                                           │
│ Set 3  [ ]  [  ]                                           │
│                                                             │
│ 0 / 3 sets                                                 │
└─────────────────────────────────────────────────────────────┘
```

With Deload badge:

```
┌─────────────────────────────────────────────────────────────┐
│ Single Leg Box Squat                    [Deload]           │
│ 3 x 8 reps                     ← Shows Week 4 (deload)     │
│                                                             │
│ Set 1  [✓]  [8]                                            │
│ Set 2  [✓]  [8]                                            │
│ Set 3  [✓]  [8]                                            │
│                                                             │
│ 3 / 3 sets                                                 │
└─────────────────────────────────────────────────────────────┘
```

With Test badge:

```
┌─────────────────────────────────────────────────────────────┐
│ Single Leg Box Squat                    [Test]             │
│ 3 x reps                       ← No target (test week)     │
│                                                             │
│ Set 1  [✓]  [20]  ← User enters what they achieved        │
│ Set 2  [✓]  [18]                                           │
│ Set 3  [✓]  [15]                                           │
│                                                             │
│ 3 / 3 sets                                                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Structure

```javascript
{
  name: "My 5-Week Program",
  numberOfWeeks: 5,
  sections: [
    {
      id: "section1",
      name: "Workout",
      type: "workout",
      days: [
        {
          id: "day1",
          name: "Monday - Leg",
          daysOfWeek: [1], // Monday
          exercises: [
            {
              id: "ex1",
              name: "Single Leg Box Squat",
              type: "reps",
              sets: 3,
              targetValue: 10, // Default target
              weeklyProgression: [
                { week: 1, targetValue: 10, isDeload: false, isTest: false },
                { week: 2, targetValue: 12, isDeload: false, isTest: false },
                { week: 3, targetValue: 14, isDeload: false, isTest: false },
                { week: 4, targetValue: 8,  isDeload: true,  isTest: false },
                { week: 5, targetValue: null, isDeload: false, isTest: true }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## User Flow

1. **Create Workout**
   - Set "Number of Weeks" to 5
   - Add sections, days, and exercises
   - System auto-generates 5 week cards per exercise

2. **Customize Progression**
   - Adjust target values for each week
   - Mark week 4 as "Deload" (recovery)
   - Mark week 5 as "Test" (max effort)

3. **Save Workout**
   - All progression data saved to database
   - Ready for execution

4. **Execute Workout**
   - System calculates current week from dates
   - Shows appropriate target value
   - Displays Deload/Test badges
   - User logs actual performance

5. **Track Progress**
   - Compare actual vs target values
   - Adjust future programs based on test results
   - Ensure proper recovery with deload weeks

## Benefits

✅ **Progressive Overload**: Systematic strength gains
✅ **Recovery Management**: Built-in deload weeks prevent burnout
✅ **Performance Testing**: Measure progress objectively
✅ **Flexibility**: Customize each exercise independently
✅ **Visual Planning**: See entire program at a glance

## Tips

- **Deload weeks**: Typically 40-60% of peak volume
- **Test weeks**: Leave target empty, push to max safely
- **Linear progression**: Add 2-5% per week
- **Wave loading**: Alternate high/low weeks for recovery
- **Block periodization**: Focus on one quality per block
