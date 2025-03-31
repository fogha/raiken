const { generateTest } = require('../src/lib/test-generation/openai.js');
require('dotenv').config();

async function runTestGeneration() {
  const prompt = {
    description: "Test the submit button functionality",
    requirements: [
      "Find the submit button",
      "Click the button",
      "Check for success message"
    ],
    expectations: [
      "Button should be clickable",
      "Success message should appear after clicking",
      "Message should contain 'Successfully submitted'"
    ]
  };

  try {
    console.log('Generating test script for current page...\n');
    const result = await generateTest(prompt);

    if (result.success && result.code) {
      console.log('Generated Test Script:');
      console.log('-------------------\n');
      console.log(result.code);
      console.log('\n-------------------');
    } else {
      console.error('Error generating test:', result.error);
    }
  } catch (error) {
    console.error('Failed to generate test:', error);
  }
}

runTestGeneration(); 