const fs = require('fs');
const filePath = 'dist/assets/index-DjPvjrrk.css';
let css = fs.readFileSync(filePath, 'utf8');

// 1. Wider Container
const t1 = '.container{width:100%;max-width:1200px;';
const r1 = '.container{width:100%;max-width:96%;';
if (css.includes(t1)) {
  css = css.replace(t1, r1);
  console.log('Patched container max-width!');
} else {
  console.log('WARNING: t1 not found!');
}

// 2. Workspace grid gaps & sidebar width
const t2 = '.workspace-layout{grid-template-columns:240px 1fr;gap:24px;';
const r2 = '.workspace-layout{grid-template-columns:260px 1fr;gap:40px;';
if (css.includes(t2)) {
  css = css.replace(t2, r2);
  console.log('Patched workspace-layout columns and gaps!');
} else {
  console.log('WARNING: t2 not found!');
}

// 3. Dashboard split columns gaps
const t3 = '.dashboard-split-columns{grid-template-columns:1fr 280px;gap:24px;';
const r3 = '.dashboard-split-columns{grid-template-columns:1fr 300px;gap:40px;';
if (css.includes(t3)) {
  css = css.replace(t3, r3);
  console.log('Patched dashboard-split-columns columns and gaps!');
} else {
  console.log('WARNING: t3 not found!');
}

// 4. Append custom utility classes for page separations and font adjustments
const customCss = `
/* Custom full-width layout for non-statistics dashboard tabs */
.full-width-layout {
  grid-template-columns: 1fr !important;
}

/* Bigger fonts, wider letter spacing, and word gaps for separated dashboard pages */
.non-statistics-panel {
  font-size: 1.18rem !important;
  letter-spacing: 0.04em !important;
  word-spacing: 0.08em !important;
  line-height: 1.85 !important;
}

.non-statistics-panel h3, 
.non-statistics-panel .section-title, 
.non-statistics-panel .pane-title {
  font-size: 1.5rem !important;
  letter-spacing: 0.04em !important;
  margin-bottom: 22px !important;
  font-weight: 800 !important;
}

.non-statistics-panel p, 
.non-statistics-panel span, 
.non-statistics-panel td, 
.non-statistics-panel th,
.non-statistics-panel label,
.non-statistics-panel input,
.non-statistics-panel textarea {
  font-size: 1.1rem !important;
  letter-spacing: 0.03em !important;
  word-spacing: 0.06em !important;
}

.non-statistics-panel .btn, 
.non-statistics-panel button {
  font-size: 1.05rem !important;
  letter-spacing: 0.04em !important;
  padding: 10px 20px !important;
}
`;

css += customCss;
fs.writeFileSync(filePath, css, 'utf8');
console.log('Stylesheet patched successfully!');
