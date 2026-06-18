const fs = require('fs');
const content = fs.readFileSync('.env', 'utf-8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('JUDGE0')) {
    console.log(`Line ${i + 1}: ${JSON.stringify(l)}`);
  }
});
