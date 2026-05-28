// accepts data object so it works for any PV, not hardcoded
function drawMetadataTable(data) {
  // data = { department, domain, filiere, speciality, room, session, date, time }
  const rows = [
    ['Département',  data.department  ?? ''],
    ['Domaine',      data.domain      ?? ''],
    ['Filière',      data.filiere     ?? ''],
    ['Spécialité',   data.speciality  ?? ''],
    ['Salle',        data.room        ?? ''],
    ['Date',         data.date        ?? ''],
    ['Horaire',      data.time        ?? ''],
  ].map(([label, value]) => [
    { text: label, style: 'metaLabel' },
    { text: value, style: 'metaValue' }
  ]);

  return {
    margin: [0, 0, 0, 16],
    table: {
      widths: [80, '*'],
      body:   rows
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#AAAAAA',
      vLineColor: () => '#AAAAAA',
      paddingTop:    () => 4,
      paddingBottom: () => 4,
    }
  };
}

module.exports = { drawMetadataTable };