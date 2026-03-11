const fs = require('fs')
const path = require('path')
const pdf = require('pdf-parse')

const pdfPath = path.resolve(__dirname, '..', 'docs', '99-ARCHIVE', 'source-materials', 'pdf', 'JARVIS-AIOS-Ebook-Completo.pdf')
const outPath = path.resolve(__dirname, '..', 'docs', '99-ARCHIVE', 'source-materials', 'pdf', 'JARVIS-AIOS-Ebook-Completo.txt')

if (!fs.existsSync(pdfPath)) {
  console.error('PDF not found:', pdfPath)
  process.exit(2)
}

const dataBuffer = fs.readFileSync(pdfPath)

pdf(dataBuffer).then(function(data) {
  fs.writeFileSync(outPath, data.text, 'utf8')
  console.log('Extracted text length:', data.text.length)
  console.log('Saved to:', outPath)
}).catch(err => {
  console.error('pdf parse error', err)
  process.exit(1)
})
