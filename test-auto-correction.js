// Test file to verify auto-correction functionality
// This file simulates API calls to test the auto-correction logic

async function testAutoCorrection() {
  const testPayload = {
    prompt: "Create a new sheet called 'Sales Data' with columns for Product, Quantity, Price, and Total",
    context: {
      data: {
        summary: {
          sheets: 1,
          labels: 0,
          sheet_names: ["Sheet1"]
        },
        context_items: []
      },
      messages: []
    },
    apiKey: "AIzaSyCtJYKNLMkn8DpsvWDyR3UQX_jCzHxiAnY" // This would be a real API key in practice
  }

  try {
    const response = await fetch('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    console.log('Test result:', JSON.stringify(result, null, 2))

    // Check if auto-correction worked
    if (result.response?.auto_corrected) {
      console.log('✅ Auto-correction worked!')
    } else if (result.response?.validation_errors?.length > 0) {
      console.log('❌ Validation errors found:', result.response.validation_errors)
    } else {
      console.log('✅ Response valid on first try')
    }

    return result
  } catch (error) {
    console.error('Test failed:', error)
    return null
  }
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testAutoCorrection }
}

// Auto-run the test when file is executed directly
if (require.main === module) {
  console.log('🧪 Starting auto-correction test...')
  console.log('📡 Server should be running on http://localhost:3000')
  console.log('')
  
  testAutoCorrection().then(result => {
    if (result) {
      console.log('')
      console.log('🎉 Test completed successfully!')
    } else {
      console.log('')
      console.log('💥 Test failed!')
      process.exit(1)
    }
  }).catch(error => {
    console.error('💥 Test crashed:', error)
    process.exit(1)
  })
} else {
  console.log('Auto-correction test file loaded.')
  console.log('To run this test:')
  console.log('1. Start your Next.js development server: npm run dev')
  console.log('2. Run: node test-auto-correction.js')
}
