const prisma      = require('../config/db');
const { encrypt } = require('../utils/crypto.utils');

// call this when importing candidates
// stores encrypted identity in separate table — original candidate untouched
async function encryptAndStoreIdentity(candidateId, { nom, prenom, email, telephone, cin }) {

  const existing = await prisma.candidate_identity.findUnique({
    where: { candidate_id: candidateId }
  });
  if (existing) throw new Error('Identity already encrypted for this candidate');

  return prisma.candidate_identity.create({
    data: {
      candidate_id:  candidateId,
      nom_enc:       encrypt(nom),
      prenom_enc:    encrypt(prenom),
      email_enc:     encrypt(email),
      telephone_enc: encrypt(telephone),
      cin_enc:       encrypt(cin)
    }
  });
}

module.exports = { encryptAndStoreIdentity };