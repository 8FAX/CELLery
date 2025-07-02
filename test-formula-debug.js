// Simple test to debug formula evaluation issue
// JavaScript version of the key functions

function parseCellReference(cellRef) {
  const match = cellRef.match(/([A-Z]+)(\d+)/);
  if (!match) return null;
  
  const col = match[1].charCodeAt(0) - 65; // A=0, B=1, etc.
  const row = parseInt(match[2]);
  return { row, col };
}

function getCellKey(position) {
  return `${String.fromCharCode(65 + position.col)}${position.row}`;
}

function getRangeValues(range, cells, allSheets) {
  const values = [];

  // Handle cross-sheet references like 'Sheet Name'!A1:B2
  const crossSheetMatch = range.match(/'([^']+)'!(.+)/);
  let targetCells = cells;
  let actualRange = range;

  if (crossSheetMatch && allSheets) {
    const sheetName = crossSheetMatch[1];
    actualRange = crossSheetMatch[2];
    targetCells = allSheets[sheetName] || {};
  }

  if (actualRange.includes(":")) {
    const [start, end] = actualRange.split(":");
    
    // Handle column-only references like C:C or F:F
    if (start.match(/^[A-Z]+$/) && end.match(/^[A-Z]+$/)) {
      const startCol = start.charCodeAt(0) - 65;
      const endCol = end.charCodeAt(0) - 65;
      
      // Get all values from these columns (up to row 10 for this test)
      for (let row = 1; row <= 10; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cellKey = getCellKey({ row, col });
          const cellData = targetCells[cellKey];
          if (cellData?.value) {
            values.push(cellData.value);
          }
        }
      }
    }
  }

  return values;
}

function evaluateSumIf(expression, cells, allSheets) {
  console.log('Evaluating SUMIF:', expression);
  
  // SUMIF(range, criteria, [sum_range])
  const match = expression.match(/SUMIF\(([^,]+),([^,]+)(?:,([^)]+))?\)/);
  if (!match) {
    console.log('No match found for SUMIF pattern');
    return 0;
  }

  const range = match[1].trim();
  const criteria = match[2].trim().replace(/"/g, "");
  const sumRange = match[3]?.trim() || range;

  console.log('Parsed SUMIF:');
  console.log('  range:', range);
  console.log('  criteria:', criteria);
  console.log('  sumRange:', sumRange);

  // Get the criteria value (could be a cell reference)
  let actualCriteria = criteria;
  if (criteria.match(/[A-Z]+\d+/)) {
    const position = parseCellReference(criteria);
    if (position) {
      const cellKey = getCellKey(position);
      const cellData = cells[cellKey];
      actualCriteria = cellData?.value || "";
    }
  }

  console.log('  actualCriteria:', actualCriteria);

  // Handle the case where sumRange contains multiplication (like F:F*H:H)
  if (sumRange.includes('*')) {
    const [leftRange, rightRange] = sumRange.split('*').map(r => r.trim());
    
    console.log('  leftRange:', leftRange);
    console.log('  rightRange:', rightRange);
    
    // Get values from the range to check criteria
    const rangeValues = getRangeValues(range, cells, allSheets);
    const leftValues = getRangeValues(leftRange, cells, allSheets);
    const rightValues = getRangeValues(rightRange, cells, allSheets);

    console.log('  rangeValues:', rangeValues);
    console.log('  leftValues:', leftValues);
    console.log('  rightValues:', rightValues);

    let sum = 0;
    for (let i = 0; i < rangeValues.length; i++) {
      console.log(`  Checking row ${i}: ${rangeValues[i]} === ${actualCriteria}?`);
      if (rangeValues[i] === actualCriteria) {
        const leftVal = parseFloat(leftValues[i]) || 0;
        const rightVal = parseFloat(rightValues[i]) || 0;
        const product = leftVal * rightVal;
        console.log(`    Match! ${leftVal} * ${rightVal} = ${product}`);
        sum += product;
      }
    }
    console.log('  Final sum:', sum);
    return sum;
  }

  return 0;
}

// Test data
const mockSheets = {
  'Car Sales Data': {
    'C2': { value: 'Alice' },
    'C3': { value: 'Bob' },
    'C4': { value: 'Charlie' },
    'C5': { value: 'Diana' },
    'C6': { value: 'Eve' },
    'C7': { value: 'Frank' },
    'C8': { value: 'Grace' },
    'C9': { value: 'Henry' },
    'F2': { value: '25000' },
    'F3': { value: '35000' },
    'F4': { value: '45000' },
    'F5': { value: '22000' },
    'F6': { value: '40000' },
    'F7': { value: '20000' },
    'F8': { value: '30000' },
    'F9': { value: '35000' },
    'H2': { value: '0.05' },
    'H3': { value: '0.06' },
    'H4': { value: '0.07' },
    'H5': { value: '0.04' },
    'H6': { value: '0.08' },
    'H7': { value: '0.03' },
    'H8': { value: '0.05' },
    'H9': { value: '0.07' },
  },
  'Commission Analysis': {
    'A2': { value: 'Alice' },
  }
};

// Test the formula
const formula = "SUMIF('Car Sales Data'!C:C,A2,'Car Sales Data'!F:F*'Car Sales Data'!H:H)";
const result = evaluateSumIf(formula, mockSheets['Commission Analysis'], mockSheets);

console.log('Expected result for Alice: 25000 * 0.05 = 1250');
console.log('Actual result:', result);
