const db = require("../config/db")

/*
check all the role conflict rules before assigning roles
returns {hasConflict:bool,reason:string}
*/

exports.checkRoleConflicts = async (userId,newRoles)=>{


 if (newRoles.includes('corrector') && newRoles.length >1){
       return {
      hasConflict: true,
      reason: 'CORRECTOR_EXCLUSIVE — corrector cannot be combined with other roles'
    }
 }


  if (userId) {
    const [existingRoles] = await db.query(
      'SELECT role FROM user_role WHERE user_id = ?', [userId]
    )
    const existing = existingRoles.map(r => r.role)

    // trying to add corrector to someone who already has roles
    if (newRoles.includes('corrector') && existing.length > 0) {
      return {
        hasConflict: true,
        reason: 'CORRECTOR_EXCLUSIVE — user already has other roles'
      }
    }

   if (existing.includes('corrector') && newRoles.length > 0) {
      return {
        hasConflict: true,
        reason: 'CORRECTOR_EXCLUSIVE — corrector cannot receive additional roles'
      }
    }
  }

  // RULE 2 — professor_creator + supervisor module conflict
  // This is checked later at competition time (when assigning to room)
  // because at account creation we don't know which competition yet
  // See room_supervisor assignment endpoint for that check

  return { hasConflict: false, reason: null }


}