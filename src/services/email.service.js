const nodemailer = require("nodemailer");
require('dotenv').config();

const transporter = nodemailer.createTransport({
   service:"gmail",
    auth:{
    user:process.env.USER_EMAIL,
    pass:process.env.USER_PASS
   }
})

 

exports.sendCredentialsEmail = async (user, plainPassword) => {

  await transporter.sendMail({

    from:    'ConcoursDoctor <noreply@esi-sba.dz>',

    to:      user.email,

    subject: 'Vos identifiants — ConcoursDoctor ESI-SBA',

    html: `

      <h2>Bonjour ${user.first_name} ${user.last_name},</h2>

      <p>Votre compte a été créé sur la plateforme <strong>ConcoursDoctor</strong>.</p>

      <p>Voici vos identifiants de connexion :</p>

      <table style="border-collapse:collapse; margin: 16px 0;">

        <tr>

          <td style="padding: 8px 16px 8px 0; font-weight:bold;">Email :</td>

          <td style="padding: 8px 0;">${user.email}</td>

        </tr>

        <tr>

          <td style="padding: 8px 16px 8px 0; font-weight:bold;">Mot de passe :</td>

          <td style="padding: 8px 0; font-family:monospace; font-size:18px; letter-spacing:2px;">

            ${plainPassword}

          </td>

        </tr>

        <tr>

          <td style="padding: 8px 16px 8px 0; font-weight:bold;">Rôle(s) :</td>

          <td style="padding: 8px 0;">${user.roles.join(', ')}</td>

        </tr>

      </table>

      <a href="${process.env.BASE_URL}/login" style="

        background-color: #4F46E5;

        color: white;

        padding: 12px 24px;

        text-decoration: none;

        border-radius: 6px;

        display: inline-block;

        margin: 16px 0;

      ">

        Se connecter

      </a>

      <p style="color:#e53e3e; font-weight:bold;">

        

      </p>

      <p>L'équipe ConcoursDoctor — ESI-SBA</p>

    `

  })

}
// note change it with a template later 