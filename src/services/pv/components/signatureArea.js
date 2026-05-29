const dayjs = require('dayjs');

function drawSignatureArea(signatories, date) {
  const rows = signatories.map(s => ([
    // left — role + name
    {
      stack: [
        { text: s.role, style: 'signatureRole'  },
        { text: s.name, style: 'signatureName'  }
      ],
      border: [false, false, false, false]
    },
    // right — signature placeholder
    {
      text:      '______________________________',
      fontSize:  9,
      color:     '#0973A8',
      alignment: 'left',
      margin:    [0, 14, 0, 0],
      border:    [false, false, false, false]
    }
  ]));

  return {
    margin: [0, 30, 0, 0],
    stack: [
      // date — top left, bold, bigger
      {
        text:     `Date : ${date ?? dayjs().format('DD/MM/YYYY')}`,
        fontSize:  11,
        bold:      true,
        color:     '#032638',
        margin:    [0, 0, 0, 14]
      },

      // horizontal divider above signatures
      {
        canvas: [
          {
            type:      'line',
            x1: 0,  y1: 0,
            x2: 760, y2: 0,
            lineWidth: 0.8,
            lineColor: '#A2DDFA'
          }
        ],
        margin: [0, 0, 0, 14]
      },

      // signatories table — name left, signature line right
      {
        table: {
          widths: Array(signatories.length).fill('*').flatMap(() => ['*', '*']),
          body:   [rows.flat()]
        },
        layout: 'noBorders'
      }
    ]
  };
}

module.exports = { drawSignatureArea };