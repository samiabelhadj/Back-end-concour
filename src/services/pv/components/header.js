// accepts title (string) and university (object from DB)
// so every PV can reuse this with its own title
function drawHeader(title, university) {
  return [
    {
      columns: [
        // left side — university info
        {
          width: '*',
          stack: [
            {
              text:      'الجمهورية الجزائرية الديمقراطية الشعبية',
              font:      'Amiri',
              fontSize:  9,
              alignment: 'right'
            },
            {
              text:      'وزارة التعليم العالي والبحث العلمي',
              font:      'Amiri',
              fontSize:  9,
              alignment: 'right'
            },
            {
              text:     university.name,
              bold:     true,
              fontSize: 10,
              margin:   [0, 4, 0, 0]
            },
            {
              text:     university.faculty,
              fontSize: 9
            }
          ]
        },
        // right side — french header
        {
          width: '*',
          stack: [
            {
              text:      'République Algérienne Démocratique et Populaire',
              fontSize:  9,
              alignment: 'left'
            },
            {
              text:      'Ministère de l\'Enseignement Supérieur et de la Recherche Scientifique',
              fontSize:  9,
              alignment: 'left'
            }
          ]
        }
      ],
      margin: [0, 0, 0, 12]
    },
    // divider line
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 760, y2: 0, lineWidth: 1 }
      ],
      margin: [0, 0, 0, 12]
    },
    // PV title
    {
      text:      title,
      style:     'title',
      margin:    [0, 0, 0, 4]
    }
  ];
}

module.exports = { drawHeader };