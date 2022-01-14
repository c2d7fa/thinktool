import Head from "next/head";
import * as React from "react";
import {IconLabel} from "../lib/icons";

import StaticPage from "../lib/StaticPage";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function RecoverAccount(props: {apiHost: string}) {
  return (
    <StaticPage>
      <Head>
        <title>Thinktool &ndash; Recover account</title>
      </Head>

      <main className="login">
        <div className="box small centered">
          <form action={`${props.apiHost}/recover-account`} method="POST">
            <p>
              You should have gotten an email with a link to this page. Enter your username, the password you want
              to use, and the code you got from the email.
            </p>
            <div className="entry">
              <label htmlFor="user">Username</label>
              <input type="text" id="user" name="user" maxLength={32} placeholder="e.g. 'username123'" required />
            </div>
            <div className="entry">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="e.g. 'correct horse battery staple'"
                required
              />
            </div>
            <div className="entry">
              <label htmlFor="key">Reset Key</label>
              <input type="text" id="key" name="key" placeholder="e.g. 'pvLb94bZPgBSMD7N26yY3v='" required />
            </div>
            <button className="submit" type="submit">
              <IconLabel icon="recoverAccount">Recover account</IconLabel>
            </button>
          </form>
        </div>
      </main>
    </StaticPage>
  );
}
