# Workout Cycle CSV Import Format

This app can import workout cycle targets from a CSV file. The importer expects the same structure as the export, with a small metadata section followed by a header row and data rows.

## File Structure

The CSV is split into two sections:

1. **Metadata rows** (optional but recommended)
2. **Data rows** (required)

### Metadata Rows

These rows appear at the top of the file before the header. They use a simple `Label,Value` format.

Required (recommended):

```
Cycle,Cycle 2
Cycle Weeks,1-5
```

Optional:

```
Cycle Dates,2026-02-09 to 2026-03-15
Total Sessions,25
```

### Header Row (Required)

The importer looks for this exact header row:

```
Cycle,Cycle Week,Date,Session Outcome,Section,Day,Exercise,Set #,Target,Actual,Set Outcome,Session Note,Both Sides
```

### Data Rows (Required)

Each data row represents a single exercise set for a specific day and cycle week.

Example:

```
Cycle 2,1,2026-02-09,,Workout,Monday - Leg,Single Leg Box Squat (Elevated Heel),1,8 reps,,,
```

## Field Notes

- **Cycle Week**: The week number in the cycle (1, 2, 3, ...).
- **Section**: One of Warmup, Workout, Cool Down, or Stretches (case-insensitive).
- **Day**: A label like `Monday - Leg`. The first word is used to infer the day of week.
- **Exercise**: The exercise name for that day.
- **Set #**: The set number for the exercise (1, 2, 3, ...).
- **Target**: The target value and unit (e.g. `8 reps`, `30 secs`, `1.25 miles`, `MAX REPS`).
- **Both Sides**: Optional. Use `true`/`yes`/`1` to mark an exercise as both-sides.
- **Actual / Set Outcome / Session Outcome / Session Note**: These are ignored during import and may be blank.

## Supported Target Formats

- `8 reps`
- `30 secs`
- `10 mins`
- `1.25 miles`
- `MAX REPS`
- `MAX SECS`

## Import Behavior

- Import replaces all sections/days/exercises in the selected cycle.
- Importing into **Create next cycle** appends a new cycle.
- If Cycle Weeks is missing, the importer uses the largest Cycle Week value it finds.
- `MAX` targets are stored as test weeks with no numeric target value.
