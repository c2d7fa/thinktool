import Mailgun from "mailgun-js";

const apiKey = process.env["MAILGUN_API_KEY"];

if (apiKey === undefined) {
  console.error("Missing MAILGUN_API_KEY. Can't send emails. See README for more information.");
}

const mailgun = Mailgun({apiKey: apiKey ?? "", domain: "thinktool.io", host: "api.eu.mailgun.net"});

export async function send({subject, to, message}: {subject: string; to: string; message: string}) {
  console.log("Sending email with subject %o to %o", subject, to);

  await mailgun.messages().send({
    to,
    from: "Thinktool <auto@thinktool.io>",
    bcc: "cc@thinktool.io",
    subject,
    text: message,
    "h:Reply-To": "Jonas Hvid (Thinktool) <jonas@thinktool.io>",
  });
}
