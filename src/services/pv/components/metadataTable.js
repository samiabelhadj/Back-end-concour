function drawMetadataTable(data) {
  const rows = [
    ['Département', data.department ?? ''],
    ['Domaine',     data.domain     ?? ''],
    ['Filière',     data.filiere    ?? ''],
    ['Spécialité',  data.speciality ?? ''],
    ['Salle',       data.room       ?? ''],
    ['Date',        data.date       ?? ''],
    ['Horaire',     data.time       ?? ''],
  ].map(([label, value]) => [
    { text: label, style: 'metaLabel',  fillColor: '#ECF8FE' },
    { text: value, style: 'metaValue'                        }
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
      hLineColor: () => '#A2DDFA',
      vLineColor: () => '#A2DDFA',
      paddingTop:    () => 5,
      paddingBottom: () => 5,
    }
  };
}

module.exports = { drawMetadataTable };