const { drawHeader       } = require('../components/header');
const { drawMetadataTable } = require('../components/metadataTable');
const { drawCandidatesTable } = require('../components/table');
const { drawSignatureArea } = require('../components/signatureArea');
const { drawFooter        } = require('../components/footer');
const { PDF               } = require('../pv.constants');
const styles                = require('../components/styles');
const dayjs                 = require('dayjs');

// data shape expected:
// {
//   university:  { name, faculty }
//   competition: { academic_year }
//   exam:        { name }
//   session:     { name, start_time, end_time }
//   room:        { name, block }
//   candidates:  [{ fullName, seatNumber, cni }]
//   supervisors: [{ role, name }]
// }
function buildAttendanceTemplate(data) {
  const formatTime = (d) =>
    new Date(d).toLocaleTimeString('fr-DZ', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });

  const docDefinition = {
    pageSize:        PDF.pageSize,
    pageOrientation: PDF.pageOrientation,
    pageMargins:     PDF.pageMargins,

    footer: (currentPage, pageCount) => drawFooter(currentPage, pageCount),

    content: [
      // 1. header — university info + PV title
      ...drawHeader(

        `FICHE DE CONTRÔLE D’IDENTITÉ ET DES PRÉSENCES\nCONCOURS DE DOCTORAT — ANNÉE UNIVERSITAIRE ${data.competition.academic_year}`,
        data.university
      ),

      // 2. metadata block — department, room, date, time
      drawMetadataTable({
        department: data.competition.department ?? '',
        domain:     data.competition.domain     ?? '',
        filiere:    data.competition.filiere    ?? '',
        speciality: data.exam.name,
        room:       `${data.room.name}${data.room.block ? ' — ' + data.room.block : ''}`,
        date:       dayjs(data.session.start_time).format('DD/MM/YYYY'),
        time:       `${formatTime(data.session.start_time)} — ${formatTime(data.session.end_time)}`
      }),

      // // 3. stats row — inscrits / présents / absents / copies
      // {
      //   margin: [0, 0, 0, 12],
      //   table: {
      //     widths: ['*', '*', '*', '*'],
      //     body: [
      //       [
      //         { text: 'Nb Inscrits',         style: 'tableHeader' },
      //         { text: 'Nb Présents',          style: 'tableHeader' },
      //         { text: 'Nb Absents',           style: 'tableHeader' },
      //         { text: 'Nb Copies Remises',    style: 'tableHeader' },
      //       ],
      //       [
      //         { text: String(data.stats.total),      alignment: 'center', fontSize: 10, bold: true },
      //         { text: String(data.stats.present),    alignment: 'center', fontSize: 10, bold: true },
      //         { text: String(data.stats.absent),     alignment: 'center', fontSize: 10, bold: true },
      //         { text: String(data.stats.copies ?? data.stats.present), alignment: 'center', fontSize: 10, bold: true },
      //       ]
      //     ]
      //   },
      //   layout: {
      //     hLineWidth: () => 0.5,
      //     vLineWidth: () => 0.5,
      //     paddingTop:    () => 6,
      //     paddingBottom: () => 6,
      //   }
      // },

      // // 4. observations box
      // {
      //   margin: [0, 0, 0, 12],
      //   stack: [
      //     { text: 'Observations :', bold: true, fontSize: 9, margin: [0, 0, 0, 4] },
      //     {
      //       table: {
      //         widths: ['*'],
      //         body:   [[{ text: data.observations ?? '', fontSize: 9, minHeight: 50 }]]
      //       },
      //       layout: {
      //         hLineWidth: () => 0.5,
      //         vLineWidth: () => 0.5,
      //       }
      //     }
      //   ]
      // },

      // 5. candidate table
      drawCandidatesTable(data.candidates, data.exams),

      // 6. signature area
      drawSignatureArea(
        data.supervisors,
        dayjs(data.session.start_time).format('DD/MM/YYYY')
      )
    ],

    styles,

    defaultStyle: {
      font:     'Roboto',
      fontSize: 9
    }
  };

  return docDefinition;
}

module.exports = { buildAttendanceTemplate };