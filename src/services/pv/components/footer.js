function drawFooter(currentPage, pageCount) {
  return {
    margin: [40, 0],
    stack: [
      // horizontal line
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
        margin: [0, 0, 0, 4]
      },
      // page number under the line
      {
        columns: [
          
          {
            text:      `Page ${currentPage} / ${pageCount}`,
            fontSize:  8,
            color:     '#0973A8',
            alignment: 'center'
          }
        ]
      }
    ]
  };
}

module.exports = { drawFooter };