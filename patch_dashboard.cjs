const fs = require('fs');
const filePath = 'dist/assets/index-LlaHGMXd.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Conditionalize metrics-row rendering
const t1 = '(0,A.jsxs)(`section`,{className:`metrics-row no-print`';
const r1 = 'n===`statistics`&&(0,A.jsxs)(`section`,{className:`metrics-row no-print`';
if (content.includes(t1)) {
  content = content.replace(t1, r1);
  console.log('Patched metrics-row rendering!');
} else {
  console.log('WARNING: t1 not found!');
}

// 2. Conditionalize subjects-ledger-pane rendering
const t2 = '(0,A.jsxs)(`aside`,{className:`subjects-ledger-pane`';
const r2 = 'n===`statistics`&&(0,A.jsxs)(`aside`,{className:`subjects-ledger-pane`';
if (content.includes(t2)) {
  content = content.replace(t2, r2);
  console.log('Patched subjects-ledger-pane rendering!');
} else {
  console.log('WARNING: t2 not found!');
}

// 3. Make dashboard-split-columns support full-width-layout class
const t3 = 'className:`dashboard-split-columns no-print`';
const r3 = 'className:`dashboard-split-columns no-print `+(n!==`statistics`?` full-width-layout`:``)';
if (content.includes(t3)) {
  content = content.replace(t3, r3);
  console.log('Patched dashboard-split-columns className!');
} else {
  console.log('WARNING: t3 not found!');
}

// 4. Make workspace-main-panel support non-statistics-panel class
const t4 = 'className:`workspace-main-panel`';
const r4 = 'className:`workspace-main-panel `+(n!==`statistics`?` non-statistics-panel`:``)';
if (content.includes(t4)) {
  content = content.replace(t4, r4);
  console.log('Patched workspace-main-panel className!');
} else {
  console.log('WARNING: t4 not found!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard split layout patched successfully!');
