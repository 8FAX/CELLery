// Test the formula evaluation 
const { evaluateFormula } = require('./utils/formula');

// Mock data similar to what the spreadsheet has
const mockSheets = {
  'Car Sales Data': {
    'C2': { value: 'Alice' },
    'C3': { value: 'Bob' },
    'C4': { value: 'Charlie' },
    'F2': { value: '25000' },
    'F3': { value: '35000' },
    'F4': { value: '45000' },
    'H2': { value: '0.05' },
    'H3': { value: '0.06' },
    'H4': { value: '0.07' },
  },
  'Commission Analysis': {
    'A2': { value: 'Alice' },
    'A3': { value: 'Bob' },
    'A4': { value: 'Charlie' },
  }
};

// Test the formula that's failing
const formula = "=SUMIF('Car Sales Data'!C:C,A2,'Car Sales Data'!F:F*'Car Sales Data'!H:H)";
const result = evaluateFormula(formula, mockSheets['Commission Analysis'], 'Commission Analysis', mockSheets);

console.log('Formula:', formula);
console.log('Result:', result);
