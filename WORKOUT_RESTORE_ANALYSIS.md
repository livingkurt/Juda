# Workout Data Restoration Analysis

## Overview

This document analyzes production database dumps from **January 6-19, 2026** to identify lost workout data that needs to be restored. The data loss occurred due to a bug in `WorkoutBuilder.jsx` that caused workout data to be lost when editing workouts.

## Source Files Analyzed

16 dump files from January 6-19, 2026:
- `production-dump-2026-01-06T09-20-19-832Z.json`
- `production-dump-2026-01-06T13-19-42-762Z.json`
- `production-dump-2026-01-06T13-22-49-073Z.json`
- `production-dump-2026-01-06T13-26-29-532Z.json`
- `production-dump-2026-01-06T13-51-18-332Z.json`
- `production-dump-2026-01-06T14-06-15-089Z.json`
- `production-dump-2026-01-07T17-01-42-326Z.json`
- `production-dump-2026-01-07T17-03-14-892Z.json`
- `production-dump-2026-01-07T17-04-08-478Z.json`
- `production-dump-2026-01-07T17-15-22-494Z.json`
- `production-dump-2026-01-07T17-16-58-672Z.json`
- `production-dump-2026-01-07T17-27-21-112Z.json`
- `production-dump-2026-01-07T21-05-29-792Z.json`
- `production-dump-2026-01-09T09-29-25-333Z.json`
- `production-dump-2026-01-13T21-39-15-510Z.json`
- `production-dump-2026-01-13T21-44-17-091Z.json`

## Summary Statistics

| Table | Unique Records Found |
|-------|----------------------|
| **WorkoutProgram** | 2 programs |
| **WorkoutSection** | 4 sections |
| **WorkoutDay** | 14 days |
| **Exercise** | 105 exercises |
| **WeeklyProgression** | 525 progressions |
| **WorkoutSetCompletion** | 176 completion records |

## Detailed Breakdown

### Workout Programs

#### Program 1
- **ID**: `cf1289c824d6a2dc5fa13fb9ab`
- **Task ID**: `c17672927719276597bc0d10`
- **Name**: (unnamed)
- **Weeks**: 5
- **Progress**: 0
- **Created**: 2026-01-02T13:23:12.283Z
- **Updated**: 2026-01-02T13:23:12.283Z

#### Program 2
- **ID**: `c47f75f8759249d5a00ed44a00`
- **Task ID**: `cm5dc9169fd8159834529e229`
- **Name**: (unnamed)
- **Weeks**: 5
- **Progress**: 0
- **Created**: 2026-01-02T13:23:12.283Z
- **Updated**: 2026-01-05T23:08:23.915Z

### Workout Sections

#### Section 1: Warmup
- **ID**: `warmup-section`
- **Program ID**: `cf1289c824d6a2dc5fa13fb9ab`
- **Type**: `warmup`
- **Order**: 0

#### Section 2: Workout
- **ID**: `workout-section`
- **Program ID**: `cf1289c824d6a2dc5fa13fb9ab`
- **Type**: `workout`
- **Order**: 1

#### Section 3: Cool Down
- **ID**: `cooldown-section`
- **Program ID**: `cf1289c824d6a2dc5fa13fb9ab`
- **Type**: `cooldown`
- **Order**: 2

#### Section 4: Stretches
- **ID**: `stretches_d1ce2f0f`
- **Program ID**: `c47f75f8759249d5a00ed44a00`
- **Type**: `stretches`
- **Order**: 0

### Workout Days

14 unique workout days found across the two programs:

**Program 1 (cf1289c824d6a2dc5fa13fb9ab)**:
- Monday - Leg (Warmup, Workout, Cooldown)
- Tuesday - Running (Warmup, Cooldown)
- Wednesday - Push (Warmup, Workout, Cooldown)
- Thursday - Running (Workout)
- Friday - Pull (Warmup, Workout, Cooldown)

**Program 2 (c47f75f8759249d5a00ed44a00)**:
- Stretches section with associated days

### Exercises

- **Total**: 105 unique exercises
- Exercises include various types: reps, time (mins/secs), distance
- Exercises are distributed across the 14 workout days
- Each exercise has associated weekly progressions (5 weeks per program)

### Weekly Progressions

- **Total**: 525 unique progressions
- Progressions span 5 weeks per program
- Each exercise has weekly target values, deload flags, and test flags

### Workout Set Completions ⚠️ **CRITICAL DATA**

- **Total**: 176 unique completion records
- **Date Range**: January 6-13, 2026 (based on dump file dates)
- **Growth Pattern**:
  - Jan 6 (early): 32 completions
  - Jan 6 (later): 51 completions
  - Jan 7: 101 completions
  - Jan 9: 110 completions
  - Jan 13: 176 completions

These completion records represent **actual workout progress** that users logged. This is the most critical data to restore as it represents user effort and progress tracking.

## Data Loss Impact

Based on the bug description, when users edited workouts in `WorkoutBuilder.jsx`, the following likely occurred:

1. **WorkoutSetCompletion records may have been deleted** - These track individual set completions
2. **Workout structure may have been corrupted** - Programs, sections, days, exercises, or progressions may have been lost

## Restoration Strategy

### Phase 1: Identify Missing Data
1. Compare current production database with dump data
2. Identify which WorkoutSetCompletion records are missing
3. Identify which workout structure records (if any) are missing

### Phase 2: Restore Missing Data
1. Restore WorkoutSetCompletion records (highest priority - user progress data)
2. Restore any missing workout structure records (programs, sections, days, exercises, progressions)
3. Ensure foreign key relationships are maintained
4. Use `INSERT ... ON CONFLICT DO NOTHING` to avoid duplicates

### Phase 3: Verification
1. Verify all records restored correctly
2. Verify foreign key relationships intact
3. Verify no duplicate records created

## Migration Approach

The migration will:
1. **Check for existing records** before inserting (using unique constraints)
2. **Preserve existing data** - only insert missing records
3. **Maintain referential integrity** - ensure all foreign keys exist
4. **Use transaction** - all-or-nothing approach

## Next Steps

1. ✅ Analyze dump files (COMPLETE)
2. ⏳ Create migration SQL to restore data
3. ⏳ Test migration locally
4. ⏳ Deploy migration to production
5. ⏳ Verify restoration success

## Notes

- All data timestamps are preserved from the original dumps
- The most recent version of each record (based on `updatedAt` or `createdAt`) is used
- WorkoutSetCompletion records are the highest priority as they represent user progress
- Workout structure data (programs, sections, days, exercises) may already exist, but we'll restore it to be safe
