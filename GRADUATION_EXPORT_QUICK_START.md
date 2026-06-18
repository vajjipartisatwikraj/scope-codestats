# Graduation-Wise Export - Quick Start Guide

## Feature Summary
Export cohort progress reports filtered by one or more graduation years. Perfect for analyzing specific graduating classes.

## How to Use

### Step 1: Open Admin Dashboard
Navigate to your Admin Dashboard and select the cohort you want to export.

### Step 2: Go to Progress Tab
Click on the "Leaderboard" or "Progress" tab in the cohort details.

### Step 3: Click Export Button
You'll see an "Export" button in the toolbar above the leaderboard table.

```
┌─────────────────────────────────────────────────────────────┐
│ Search | [Filter Options] | [Export ↓] | [⟳ Refresh]      │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Select Graduation Year(s)
After clicking "Export", a dropdown appears:

```
┌──────────────────────────────────────────────────────────────┐
│ ☐ All Years                                                   │
│ ☑ 2024                                                        │
│ ☑ 2025                                                        │
│ ☐ 2026                                                        │
└──────────────────────────────────────────────────────────────┘
```

You can:
- Select specific years with checkboxes
- Leave unselected for "All Years" (full export)
- Select multiple years for combined export

### Step 5: Confirm Export
Click "Confirm Export" button to download the Excel file.

```
┌─────────────────────────────┐
│ ✓ Confirm Export │ ✗ Cancel │
└─────────────────────────────┘
```

### Step 6: Receive File
The Excel file downloads with a name like:
- `Cohort_Title_Progress_Report_Grad2024-2025_2024-06-19.xlsx`
- `Cohort_Title_Progress_Report_2024-06-19.xlsx` (if no filter)

## What Gets Exported

### 📊 Sheet 1: Cohort Overview
- Cohort name, description, dates
- Module count
- **Graduation Years (Filtered)** - Shows your selection
- Student counts (recalculated for selected years)
- Completion rates

### 📋 Sheet 2: Student Rankings
- Only students from selected graduation years
- Rank, name, roll number, department, section
- Scores and completion status
- Top 3 students highlighted with medals

### 📚 Sheet 3: Module Details
- Module-wise completion statistics
- Completion percentages (recalculated)
- Students completed per module

### 📈 Sheet 4: Statistics
- Overall metrics for filtered students
- Module completion rates

## Examples

### Example 1: Export Class of 2024
1. Click "Export"
2. Select only "2024"
3. Click "Confirm Export"
4. File generated: `...Progress_Report_Grad2024_2024-06-19.xlsx`
5. Contains only 2024 graduating class data

### Example 2: Export Multiple Classes
1. Click "Export"
2. Select "2024" and "2025"
3. Click "Confirm Export"
4. File generated: `...Progress_Report_Grad2024-2025_2024-06-19.xlsx`
5. Contains data from both 2024 and 2025 graduating classes

### Example 3: Export All Students (No Filter)
1. Click "Export"
2. Click "Confirm Export" (without selecting any years)
3. File generated: `...Progress_Report_2024-06-19.xlsx`
4. Contains all student data regardless of graduation year

## Features

✅ **Multi-select**: Choose one or multiple graduation years  
✅ **Dynamic Filename**: Year information included in downloaded file  
✅ **Smart Calculation**: All statistics recalculate based on filtered data  
✅ **Transparency**: Overview sheet shows which years were filtered  
✅ **Dark Mode**: Works in both light and dark themes  
✅ **Mobile Friendly**: Responsive design for all screen sizes  

## Tips & Tricks

💡 **Compare Classes**: Export different graduating years separately to compare performance

💡 **Track Progress**: Graduation year filter helps identify cohort-specific trends

💡 **Reports**: Create semester/year-specific reports for administration

💡 **Analysis**: Better data isolation for statistical analysis by cohort

## Troubleshooting

**Q: File doesn't download**
- A: Check browser pop-up settings, enable pop-ups for the site

**Q: Data looks wrong**
- A: Verify you selected the correct graduation years in the dropdown

**Q: Missing students**
- A: If students not appearing, they may not have graduation year set in their profile

**Q: Export includes everyone**
- A: You didn't select any years - this is "All Years" mode (correct behavior)

## Keyboard Shortcuts
- Click "Export" → Dropdown opens
- Select years using mouse or arrow keys
- Press Tab to navigate between options
- Press Enter to confirm export
- Press Escape to cancel

## Related Features
- View filters above leaderboard (separate from export filter)
- Export filters are **independent** of display filters
- Selecting "Year" filter above doesn't affect export selection
- Export selection is temporary (resets after download)

## File Format
- Excel (.xlsx) format
- Compatible with:
  - Microsoft Excel
  - Google Sheets
  - LibreOffice Calc
  - Any spreadsheet software

## Data Security
- Export happens locally in your browser
- No data sent to external servers
- File only contains cohort members' data
- Admin access required to export

---

**Need Help?** Check the detailed documentation in `GRADUATION_WISE_EXPORT_FEATURE.md`
