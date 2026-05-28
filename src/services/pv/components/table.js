function drawCandidatesTable(candidates) {
  const header = [
    { text: 'N°',                    style: 'tableHeader' },
    { text: 'Nom et Prénoms',        style: 'tableHeader' },
    { text: 'N° Place',              style: 'tableHeader' },
    { text: 'N° CNI',                style: 'tableHeader' },
    { text: 'Ep1\nEmargement',       style: 'tableHeader' },
    { text: 'Ep2\nEmargement',       style: 'tableHeader' },
  ];

  const rows = candidates.map((c, i) => [
    { text: String(i + 1),           alignment: 'center', fontSize: 9 },
    { text: c.fullName,              fontSize: 9                       },
    { text: String(c.seatNumber ?? ''), alignment: 'center', fontSize: 9 },
    { text: c.cni ?? '',             alignment: 'center', fontSize: 9  },
    { text: '',                      fontSize: 9                       },
    { text: '',                      fontSize: 9                       },
  ]);

  return {
    margin: [0, 0, 0, 16],
    table: {
      headerRows: 1,
      widths:     [25, '*', 50, 90, 80, 80],
      body:       [header, ...rows]
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#000000',
      vLineColor: () => '#000000',
      paddingTop:    () => 5,
      paddingBottom: () => 5,
    }
  };
}

module.exports = { drawCandidatesTable };