import * as nodemailer from "nodemailer";

const config = {
  port: +process.env.DIAFORM_SMTP_PORT!,
  host: process.env.DIAFORM_SMTP_HOST,
  username: process.env.DIAFORM_SMTP_USERNAME,
  password: process.env.DIAFORM_SMTP_PASSWORD,
};

export async function send({subject, to, message}: {subject: string; to: string; message: string}) {
  const transport = nodemailer.createTransport({
    port: config.port,
    host: config.host,
    auth: {
      user: config.username,
      pass: config.password,
    },
    secure: true,
  });
  await transport.sendMail({
    from: "Thinktool <auto@thinktool.io>",
    subject,
    to,
    text: message,
    replyTo: "Jonas Hvid (Thinktool) <jonas@thinktool.io>",
  });
}
