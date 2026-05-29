const fs   = require('fs');
const path = require('path');

// loads logo as base64 so pdfmake can embed it
// works with both local file paths and URLs
function loadLogo(logo_url) {
  if (!logo_url) return null;

  try {
    // local file path
    if (!logo_url.startsWith('http')) {
      const resolved = path.resolve(logo_url);
      if (fs.existsSync(resolved)) {
        const data = fs.readFileSync(resolved);
        const ext  = path.extname(resolved).toLowerCase().replace('.', '');
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${data.toString('base64')}`;
      }
    }
    // if it's a URL just return as-is — pdfmake can handle http URLs
    return logo_url;
  } catch (e) {
    console.warn('Logo load failed:', e.message);
    return null;
  }
}

function drawHeader(title, university) {
  const logo = loadLogo(university.logo_url);

  // french left block
  const frenchBlock = {
    width: '*',
    stack: [
      {
        text:      'République Algérienne Démocratique et Populaire',
        fontSize:  8,
        color:     '#032638',
        alignment: 'left'
      },
      {
        text:      'Ministère de l\'Enseignement Supérieur et de la Recherche Scientifique',
        fontSize:  8,
        color:     '#032638',
        alignment: 'left',
        margin:    [0, 2, 0, 0]
      },
      {
        text:      university.name,
        bold:      true,
        fontSize:  9,
        color:     '#032638',
        alignment: 'left',
        margin:    [0, 4, 0, 0]
      },
      {
        text:      university.faculty,
        fontSize:  8,
        color:     '#0973A8',
        alignment: 'left'
      }
    ]
  };

  // center logo block
  const logoBlock = logo
    ? {
        width:     60,
        image:     logo,
        width:     60,
        height:    60,
        alignment: 'center',
        margin:    [10, 0, 10, 0]
      }
    : {
        width:     60,
        text:      '',
        margin:    [10, 0, 10, 0]
      };

  // arabic right block
  const arabicBlock = {
    width: '*',
    stack: [
      {
        text:      'الجمهورية الجزائرية الديمقراطية الشعبية',
        font:      'Amiri',
        fontSize:  8,
        color:     '#032638',
        alignment: 'right'
      },
      {
        text:      'وزارة التعليم العالي والبحث العلمي',
        font:      'Amiri',
        fontSize:  8,
        color:     '#032638',
        alignment: 'right',
        margin:    [0, 2, 0, 0]
      },
      {
        text:      university.name_ar,
        font:      'Amiri',
        bold:      true,
        fontSize:  9,
        color:     '#032638',
        alignment: 'right',
        margin:    [0, 4, 0, 0]
      },
      {
        text:      university.faculty,
        font:      'Amiri',
        fontSize:  8,
        color:     '#0973A8',
        alignment: 'right'
      }
    ]
  };

  return [
    // three column layout: french | logo | arabic
    {
      columns:  [frenchBlock, logoBlock, arabicBlock],
      margin:   [0, 0, 0, 10]
    },

    // divider line
    {
      canvas: [
        {
          type:      'line',
          x1:        0,   y1: 0,
          x2:        760, y2: 0,
          lineWidth: 1.5,
          lineColor: '#0973A8'
        }
      ],
      margin: [0, 0, 0, 14]
    },

    // title in shaded box
    {
      table: {
        widths: ['*'],
        body: [[
          {
            text:      title,
            style:     'title',
            fillColor: '#C7EBFC',
            margin:    [0, 10, 0, 10],
            border:    [false, false, false, false]
          }
        ]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingTop:    () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 14]
    }
  ];
}

module.exports = { drawHeader };