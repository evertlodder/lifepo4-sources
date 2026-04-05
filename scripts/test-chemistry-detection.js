#!/usr/bin/env node
/**
 * test-chemistry-detection.js
 * 
 * Quick test to verify chemistry filtering works correctly
 */

const { ChemistryDetector, QAExtractor } = require('./mine-forums-global-v2-FILTERED.js');

const detector = new ChemistryDetector();

// Test cases
const testCases = [
  {
    text: "I have a LiFePO4 battery in my camper and it works great for off-grid living.",
    expected: { isLiFePO4: true, chemistry: 'LiFePO4' },
    name: "Valid LiFePO4"
  },
  {
    text: "My old lead-acid battery died after 2 years.",
    expected: { isLiFePO4: false, chemistry: 'lead-acid' },
    name: "Lead-acid rejection"
  },
  {
    text: "I switched from LiPo batteries to LiFePO4 for safety.",
    expected: { isLiFePO4: true, chemistry: 'LiFePO4' },
    name: "LiFePO4 dominates over LiPo mention"
  },
  {
    text: "NMC batteries have higher energy density but LiFePO4 is safer.",
    expected: { isLiFePO4: false, chemistry: 'generic-lithium' },
    name: "NMC rejection (even with LiFePO4 mention in context)"
  },
  {
    text: "Generic lithium ion battery for my phone.",
    expected: { isLiFePO4: false, chemistry: 'generic-lithium' },
    name: "Generic lithium rejection"
  },
  {
    text: "LFP 200Ah battery bank for solar system.",
    expected: { isLiFePO4: true, chemistry: 'LiFePO4' },
    name: "LFP abbreviation"
  },
  {
    text: "Lithium Iron Phosphate cells are what I need.",
    expected: { isLiFePO4: true, chemistry: 'LiFePO4' },
    name: "Full chemistry name"
  }
];

console.log('🧪 Chemistry Detection Test Suite\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((test, idx) => {
  const result = detector.detect(test.text);
  const match = result.isLiFePO4 === test.expected.isLiFePO4 &&
                result.chemistry === test.expected.chemistry;

  const status = match ? '✅ PASS' : '❌ FAIL';
  const verdict = match ? passed++ : failed++;

  console.log(`\n${idx + 1}. ${test.name}`);
  console.log(`   Input: "${test.text.substring(0, 50)}..."`);
  console.log(`   Expected: ${test.expected.chemistry}, LiFePO4=${test.expected.isLiFePO4}`);
  console.log(`   Got:      ${result.chemistry}, LiFePO4=${result.isLiFePO4}`);
  console.log(`   ${status}`);
  
  if (result.reason) {
    console.log(`   Reason: ${result.reason}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
console.log(`   Pass rate: ${((passed / testCases.length) * 100).toFixed(0)}%\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! Chemistry filtering is working correctly.\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} test(s) failed. Review detection logic.\n`);
  process.exit(1);
}
