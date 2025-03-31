import { generateTest } from '../lib/test-generation/openai';

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
    ],
    url: ""
  };

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
}

// Run the script
runTestGeneration().catch(console.error); 