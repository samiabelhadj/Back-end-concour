// candidates = [{ fullName, seatNumber, cni }]
// exams = [{ id, name }]  — all exams in the competition

function drawCandidatesTable(candidates, exams) {
  // dynamic epreuve columns in the header
  const fixedHeaders = [
    { text: 'N°',                        style: 'tableHeader' },
    { text: 'Nom et Prénoms du candidat', style: 'tableHeader' },
    { text: 'N° Place',                  style: 'tableHeader' },
    { text: 'N° CNI',                    style: 'tableHeader' },
  ];

  const examHeaders = exams.flatMap((exam, i) => [
    { text: `Ep${i + 1}\n${exam.name}`, style: 'tableHeader' },
    { text: 'Emargement',               style: 'tableHeader' }
  ]);

  const header = [...fixedHeaders, ...examHeaders];

  // fixed widths + 2 columns per exam (ep label + emargement)
  const fixedWidths  = [25, '*', 50, 90];
  const examWidths   = exams.flatMap(() => [50, 70]);
  const widths       = [...fixedWidths, ...examWidths];

  const rows = candidates.map((c, i) => {
    const fill = i % 2 === 0 ? '#ECF8FE' : '#FFFFFF';

    const fixedCells = [
      { text: String(i + 1),               alignment: 'center', fontSize: 9, fillColor: fill },
      { text: c.fullName,                  fontSize: 9,         fillColor: fill },
      { text: String(c.seatNumber ?? ''),  alignment: 'center', fontSize: 9, fillColor: fill },
      { text: c.cni ?? '',                 alignment: 'center', fontSize: 9, fillColor: fill },
    ];

    // one empty ep cell + one empty emargement cell per exam
    const examCells = exams.flatMap(() => [
      { text: '', fontSize: 9, fillColor: fill },
      { text: '', fontSize: 9, fillColor: fill },
    ]);

    return [...fixedCells, ...examCells];
  });

  return {
    margin: [0, 0, 0, 16],
    table: {
      headerRows: 1,
      widths,
      body: [header, ...rows]
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