// Test file for successful cases - should pass without auto-correction
async function testSuccessfulCase() {
  const testPayload = {
    prompt: "Add the value 'Hello World' to cell A1 in Sheet1",
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
    apiKey: "AIzaSyCtJYKNLMkn8DpsvWDyR3UQX_jCzHxiAnY"
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
    console.log('✅ SUCCESSFUL TEST RESULT:')
    console.log(JSON.stringify(result, null, 2))

    if (result.response?.auto_corrected) {
      console.log('🔧 Auto-correction was needed')
    } else if (result.response?.validation_errors?.length > 0) {
      console.log('❌ Validation errors:', result.response.validation_errors)
    } else {
      console.log('🎉 Perfect! Response valid on first try')
    }

    return result
  } catch (error) {
    console.error('❌ Test failed:', error)
    return null
  }
}

// Run the test
console.log('🧪 Testing successful case (should work without auto-correction)...')
testSuccessfulCase()
