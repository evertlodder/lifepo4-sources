#!/usr/bin/env node
/**
 * validate-qa-output.js
 * 
 * Validates the output JSON from mining script
 * Checks:
 * - Valid JSON structure
 * - Chemistry filtering compliance
 * - Confidence scores reasonable
 * - Required fields present
 */

const fs = require('fs');
const path = require('path');

class QAValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      total: 0,
      valid: 0,
      invalid: 0,
      lowConfidence: 0
    };
  }

  validate(filepath) {
    console.log(`🔍 Validating: ${filepath}\n`);

    // Step 1: Parse JSON
    let data;
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      data = JSON.parse(content);
    } catch (err) {
      console.error(`❌ Invalid JSON: ${err.message}`);
      return false;
    }

    // Step 2: Validate metadata
    this.validateMetadata(data.metadata);

    // Step 3: Validate data array
    if (!Array.isArray(data.data)) {
      this.errors.push('Root "data" is not an array');
      return false;
    }

    this.stats.total = data.data.length;

    // Step 4: Validate each record
    data.data.forEach((record, idx) => {
      if (this.validateRecord(record, idx)) {
        this.stats.valid++;
      } else {
        this.stats.invalid++;
      }
    });

    this.printReport();
    return this.errors.length === 0;
  }

  validateMetadata(meta) {
    if (!meta) {
      this.errors.push('Missing metadata object');
      return;
    }

    if (!meta.generated_at) {
      this.errors.push('Missing metadata.generated_at');
    }

    if (meta.filter !== 'LiFePO4 ONLY') {
      this.warnings.push(`Filter is "${meta.filter}", expected "LiFePO4 ONLY"`);
    }

    if (typeof meta.stats !== 'object') {
      this.errors.push('Missing or invalid metadata.stats');
    } else {
      const { processed, accepted, rejected } = meta.stats;
      const total = processed || 0;
      const acceptRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : 0;
      
      if (acceptRate < 2) {
        this.warnings.push(`Low acceptance rate: ${acceptRate}%`);
      }
      if (acceptRate > 20) {
        this.warnings.push(`High acceptance rate: ${acceptRate}% (may indicate weak filtering)`);
      }
    }
  }

  validateRecord(record, idx) {
    const errors = [];

    // Required fields
    if (!record.question || record.question.length < 5) {
      errors.push(`Record ${idx}: Invalid question`);
    }
    if (!record.answer || record.answer.length < 10) {
      errors.push(`Record ${idx}: Invalid answer`);
    }
    if (!record.source) {
      errors.push(`Record ${idx}: Missing source`);
    }

    // Chemistry check
    if (record.chemistry !== 'LiFePO4') {
      errors.push(`Record ${idx}: Chemistry is "${record.chemistry}", expected "LiFePO4"`);
    }

    // Confidence checks
    if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1) {
      errors.push(`Record ${idx}: Invalid confidence score`);
    } else if (record.confidence < 0.5) {
      this.stats.lowConfidence++;
      this.warnings.push(`Record ${idx}: Low confidence (${(record.confidence * 100).toFixed(0)}%)`);
    }

    // Extract metadata
    if (!record.extracted_at) {
      this.warnings.push(`Record ${idx}: Missing extracted_at`);
    }

    if (errors.length > 0) {
      this.errors.push(...errors);
      return false;
    }

    return true;
  }

  printReport() {
    console.log('📊 Validation Report:\n');
    
    console.log(`  Total records: ${this.stats.total}`);
    console.log(`  Valid: ${this.stats.valid} ✅`);
    console.log(`  Invalid: ${this.stats.invalid} ❌`);
    
    if (this.stats.lowConfidence > 0) {
      console.log(`  Low confidence (<50%): ${this.stats.lowConfidence} ⚠️`);
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.slice(0, 5).forEach(w => console.log(`  - ${w}`));
      if (this.warnings.length > 5) {
        console.log(`  ... and ${this.warnings.length - 5} more`);
      }
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
      if (this.errors.length > 5) {
        console.log(`  ... and ${this.errors.length - 5} more`);
      }
    } else {
      console.log(`\n✅ All validations passed!`);
    }
  }
}

// Run validator on latest output
if (require.main === module) {
  const outputDir = '/mnt/user-data/outputs';
  
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('lifepo4-qa-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error('No Q&A output files found.');
      process.exit(1);
    }

    const latest = path.join(outputDir, files[0]);
    const validator = new QAValidator();
    const isValid = validator.validate(latest);

    process.exit(isValid ? 0 : 1);
  } catch (err) {
    console.error('Validation error:', err.message);
    process.exit(1);
  }
}

module.exports = { QAValidator };
