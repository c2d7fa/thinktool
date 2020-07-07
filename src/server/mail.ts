import sendgrid from "@sendgrid/mail";

const apiKey = process.env["SENDGRID_API_KEY"];
if (apiKey === undefined) {
  console.error("Missing SENDGRID_API_KEY. Can't send emails. See README for more information.");
} else {
  sendgrid.setApiKey(apiKey);
}

export async function send({subject, to, message}: {subject: string; to: string; message: string}) {
  console.log("Sending email with subject %o to %o", subject, to);
  await sendgrid.send({
    to,
    from: "Thinktool <auto@thinktool.io>",
    bcc: "cc@thinktool.io",
    subject,
    text: message,
    replyTo: "Jonas Hvid (Thinktool) <jonas@thinktool.io>",
  });
}
