function drawCandidatesTable(candidates) {
  const header = [
    { text: 'N°',                       style: 'tableHeader' },
    { text: 'Nom et Prénoms du candidat', style: 'tableHeader' },
    { text: 'N° Place',                 style: 'tableHeader' },
    { text: 'N° CNI',                   style: 'tableHeader' },
    { text: 'Ep1\nEmargement',          style: 'tableHeader' },
    { text: 'Ep2\nEmargement',          style: 'tableHeader' },
  ];

  const rows = candidates.map((c, i) => [
    { text: String(i + 1),                  alignment: 'center', fontSize: 9, fillColor: i % 2 === 0 ? '#ECF8FE' : '#FFFFFF' },
    { text: c.fullName,                     fontSize: 9,         fillColor: i % 2 === 0 ? '#ECF8FE' : '#FFFFFF' },
    { text: String(c.seatNumber ?? ''),     alignment: 'center', fontSize: 9, fillColor: i % 2 === 0 ? '#ECF8FE' : '#FFFFFF' },
    { text: c.cni ?? '',                    alignment: 'center', fontSize: 9, fillColor: i % 2 === 0 ? '#ECF8FE' : '#FFFFFF' },
    { text: '',                             fontSize: 9,         fillColor: i % 2 === 0 ? '#ECF8FE' : '#FFFFFF' },
    { text: '',                             fontSize: 9,         fillColor: i % 2 === 0 ? '#ECF8FE' : '#FFFFFF' },
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
      hLineColor: () => '#A2DDFA',
      vLineColor: () => '#A2DDFA',
      paddingTop:    () => 5,
      paddingBottom: () => 5,
    }
  };
}

module.exports = { drawCandidatesTable };