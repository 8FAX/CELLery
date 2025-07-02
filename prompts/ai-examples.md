# AI Spreadsheet Examples

## 🚨 CRITICAL: HOW TO CREATE SHEETS

### ✅ CORRECT - Creating a New Sheet
```json
{
  "actions": {
    "create_sheet": [
      {
        "name": "Car Sales Data",
        "description": "Car sales tracking sheet with comprehensive headers",
        "headers": ["Car Model", "Sale Date", "Salesperson", "Sale Price", "Quantity", "Total Revenue", "Time in Lot (days)", "Commission Percent", "Service Deal (Yes/No)", "Bundle Type"]
      }
    ]
  },
  "message": "I've created a new 'Car Sales Data' sheet with all the headers you specified.",
  "recursive": false
}
```

### ❌ WRONG - Don't Use suggest_change for Sheet Creation
```json
{
  "actions": {
    "suggest_change": [
      {
        "type": "create_sheet",
        "sheet": "Car Sales Data",
        "description": "Create sheet"
      }
    ]
  }
}
```

## 🚨 CRITICAL: HOW TO ADD BULK DATA

### ✅ CORRECT - Using bulk_insert for Multiple Rows
```json
{
  "actions": {
    "bulk_insert": [
      {
        "sheet": "Car Sales Data",
        "start_cell": "A2",
        "end_cell": "J4",
        "data": "{\"2\": [\"Sedan\", \"2024-07-01\", \"Alice\", \"25000\", \"1\", \"25000\", \"5\", \"0.05\", \"No\", \"Standard\"], \"3\": [\"SUV\", \"2024-07-02\", \"Bob\", \"35000\", \"1\", \"35000\", \"8\", \"0.06\", \"Yes\", \"Premium\"], \"4\": [\"Truck\", \"2024-07-03\", \"Charlie\", \"45000\", \"1\", \"45000\", \"3\", \"0.04\", \"No\", \"Standard\"]}",
        "description": "Add 3 initial rows of sample car sales data"
      }
    ]
  },
  "message": "I've added 3 initial rows of sample car sales data with realistic values for all columns.",
  "recursive": false
}
```

### ❌ WRONG - Don't Use Multiple suggest_change for Bulk Data
```json
{
  "actions": {
    "suggest_change": [
      {
        "type": "value",
        "sheet": "Car Sales Data",
        "range": "A2",
        "value": "Sedan"
      },
      {
        "type": "value", 
        "sheet": "Car Sales Data",
        "range": "B2",
        "value": "2024-07-01"
      }
      // ... 30 more individual cell updates
    ]
  }
}
```

## 🚨 CRITICAL: HOW TO UPDATE SINGLE CELLS

### ✅ CORRECT - Single Cell Updates
```json
{
  "actions": {
    "suggest_change": [
      {
        "type": "value",
        "sheet": "Car Sales Data",
        "range": "A1",
        "value": "Updated Value",
        "description": "Update cell A1 with new value"
      }
    ]
  },
  "message": "I've updated cell A1 with the new value.",
  "recursive": false
}
```

## 🚨 CRITICAL: HOW TO ADD FORMULAS

### ✅ CORRECT - Adding Formulas
```json
{
  "actions": {
    "suggest_change": [
      {
        "type": "formula",
        "sheet": "Car Sales Data", 
        "range": "F2:F10",
        "formula": "=D2*E2",
        "description": "Calculate Total Revenue by multiplying Sale Price by Quantity"
      }
    ]
  },
  "message": "I've added formulas to calculate Total Revenue for each row.",
  "recursive": false
}
```

## 🎯 COMPLETE WORKFLOW EXAMPLES

### Example 1: Create Sheet + Add Data
```json
{
  "actions": {
    "create_sheet": [
      {
        "name": "Employee Data",
        "description": "Employee tracking sheet",
        "headers": ["Name", "Department", "Salary", "Start Date"]
      }
    ],
    "bulk_insert": [
      {
        "sheet": "Employee Data",
        "start_cell": "A2", 
        "end_cell": "D4",
        "data": "{\"2\": [\"John Smith\", \"Engineering\", \"75000\", \"2024-01-15\"], \"3\": [\"Jane Doe\", \"Marketing\", \"65000\", \"2024-02-01\"], \"4\": [\"Bob Johnson\", \"Sales\", \"55000\", \"2024-03-10\"]}",
        "description": "Add initial employee data"
      }
    ]
  },
  "message": "I've created the Employee Data sheet and added 3 employee records.",
  "recursive": false
}
```

### Example 2: Multi-Step Data Entry
```json
{
  "actions": {
    "bulk_insert": [
      {
        "sheet": "Sales Data",
        "start_cell": "A2",
        "end_cell": "D6", 
        "data": "{\"2\": [\"Product A\", \"100\", \"10.50\", \"1050\"], \"3\": [\"Product B\", \"50\", \"25.00\", \"1250\"], \"4\": [\"Product C\", \"75\", \"15.75\", \"1181.25\"], \"5\": [\"Product D\", \"200\", \"8.25\", \"1650\"], \"6\": [\"Product E\", \"125\", \"12.00\", \"1500\"]}",
        "description": "Add 5 product sales records"
      }
    ]
  },
  "message": "I've added 5 product sales records with calculated totals.",
  "recursive": false
}
```

## 🔥 KEY RULES TO REMEMBER

1. **Sheet Creation**: ALWAYS use `create_sheet` action, NEVER `suggest_change`
2. **Bulk Data**: Use `bulk_insert` for 3+ rows, NOT multiple `suggest_change` actions  
3. **Single Updates**: Use `suggest_change` for individual cells or formulas
4. **Sheet References**: Only reference sheets that exist in the context or are being created
5. **Data Format**: bulk_insert data must be JSON string with row numbers as keys
6. **Cell Ranges**: Make sure start_cell and end_cell match your data dimensions

## 📋 QUICK CHECKLIST

Before sending response, verify:
- [ ] Am I creating a sheet? → Use `create_sheet`
- [ ] Am I adding 3+ rows? → Use `bulk_insert` 
- [ ] Am I updating 1-2 cells? → Use `suggest_change`
- [ ] Do all referenced sheets exist? → Check available sheets list
- [ ] Is my JSON valid? → Validate structure
