const dayjs = require('dayjs');

// signatories = array of { role: string, name: string }
// example: [
//   { role: 'Surveillant Responsable', name: 'BENALI Ahmed' },
//   { role: 'Chef de Département',     name: 'MANSOURI Yacine' }
// ]
function drawSignatureArea(signatories, date) {
  const columns = signatories.map(s => ({
    width: `${Math.floor(100 / signatories.length)}%`,
    stack: [
      { text: s.role, style: 'signatureRole'                    },
      { text: s.name, style: 'signatureName'                    },
      { text: '______________________________', alignment: 'center', fontSize: 9 }
    ]
  }));

  return {
    margin: [0, 30, 0, 0],
    stack: [
      {
        text:   `Date : ${date ?? dayjs().format('DD/MM/YYYY')}`,
        fontSize: 9,
        margin: [0, 0, 0, 16]
      },
      { columns }
    ]
  };
}

module.exports = { drawSignatureArea };