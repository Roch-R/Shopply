const sharp = require('sharp');
const fs = require('fs');

const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="200" height="260">
  <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="#7c3aed" stroke-width="14"/>
  <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="#7c3aed" stroke-width="14" stroke-linecap="round"/>
  <circle cx="68" cy="70" r="7" fill="#7c3aed"/>
  <circle cx="132" cy="70" r="7" fill="#7c3aed"/>
  <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162" fill="none" stroke="#FFD166" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

sharp(Buffer.from(svgCode))
  .png()
  .toFile('d:\\CODE FOR STUDENTS\\myproduct\\myproduct-backend\\storage\\app\\images\\shopply-logo.png')
  .then(() => console.log('Successfully generated shopply-logo.png'))
  .catch(err => console.error('Error generating image:', err));
