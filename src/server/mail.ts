import * as https from "https";
import * as querystring from "querystring";

const apiKey = process.env["MAILGUN_API_KEY"];

if (apiKey === undefined) {
  console.error("Missing MAILGUN_API_KEY. Can't send emails. See README for more information.");
}

function request(
  method: "GET" | "POST",
  endpoint: string,
  data?: any,
): Promise<{status: number; body: string; json?: any}> {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: "api.eu.mailgun.net",
      path: "/v3/thinktool.io/" + endpoint,
      method,
      headers: {
        "Authorization": `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    request.on("response", (response) => {
      let body = "";

      response.on("data", (chunk) => {
        body += chunk;
      });

      response.on("end", () => {
        let json: any = undefined;

        if (response.headers["content-type"] === "application/json") {
          try {
            json = JSON.parse(body);
          } catch (e) {
            console.warn("Malformed response from Mailgun! %o", body);
          }
        }

        resolve({status: response.statusCode ?? 990, body, json});
      });
    });

    if (data !== undefined) {
      request.write(querystring.stringify(data));
    }

    request.end();
  });
}

export type Email = {subject: string; to: string; message: string};

export async function send({to, subject, message}: Email) {
  console.log("Sending email with subject %o to %o", subject, to);

  const response = await request("POST", "messages", {
    to,
    "from": "Thinktool <auto@thinktool.io>",
    "bcc": "cc@thinktool.io",
    subject,
    "text": message,
    "h:Reply-To": "Jonas Hvid (Thinktool) <jonas@thinktool.io>",
  });

  if (response.status !== 200) {
    console.warn("Unable to send email: %o", response);
  }
}
