function drawHeader(title, university) {
  return [
    // top bilingual block
    {
      columns: [
        {
          width: '*',
          stack: [
            {
              text:      'الجمهورية الجزائرية الديمقراطية الشعبية',
              font:      'Amiri',
              fontSize:  9,
              alignment: 'right',
              color:     '#032638'
            },
            {
              text:      'وزارة التعليم العالي والبحث العلمي',
              font:      'Amiri',
              fontSize:  9,
              alignment: 'right',
              color:     '#032638'
            },
            {
              text:      university.name,
              bold:      true,
              fontSize:  10,
              color:     '#032638',
              margin:    [0, 4, 0, 0]
            },
            {
              text:      university.faculty,
              fontSize:  9,
              color:     '#0973A8'
            }
          ]
        },
        {
          width: '*',
          stack: [
            {
              text:      'République Algérienne Démocratique et Populaire',
              fontSize:  9,
              alignment: 'left',
              color:     '#032638'
            },
            {
              text:      'Ministère de l\'Enseignement Supérieur et de la Recherche Scientifique',
              fontSize:  9,
              alignment: 'left',
              color:     '#032638'
            }
          ]
        }
      ],
      margin: [0, 0, 0, 10]
    },

    // divider
    {
      canvas: [
        {
          type:      'line',
          x1: 0,  y1: 0,
          x2: 760, y2: 0,
          lineWidth: 1.5,
          lineColor: '#0973A8'
        }
      ],
      margin: [0, 0, 0, 14]
    },

    // title in a shaded box
    {
      table: {
        widths: ['*'],
        body: [[
          {
            text:            title,
            style:           'title',
            fillColor:       '#C7EBFC',
            margin:          [0, 10, 0, 10],
            border:          [false, false, false, false]
          }
        ]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingTop:    () => 0,
        paddingBottom: () => 0,
        fillColor:     () => '#C7EBFC'
      },
      margin: [0, 0, 0, 14]
    }
  ];
}

module.exports = { drawHeader };