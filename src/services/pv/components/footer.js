function drawFooter(currentPage, pageCount) {
  return {
    columns: [
      {
        text:      new Date().toLocaleDateString('fr-DZ'),
        fontSize:  8,
        alignment: 'left'
      },
      {
        text:      `Page ${currentPage} / ${pageCount}`,
        fontSize:  8,
        alignment: 'right'
      }
    ],
    margin: [40, 0]
  };
}

module.exports = { drawFooter };