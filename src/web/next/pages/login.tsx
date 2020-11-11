import Head from "next/head";
import * as React from "react";

import StaticPage from "../lib/StaticPage";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function Login(props: {apiHost: string}) {
  React.useEffect(() => {
    if (process.browser) {
      fetch(`${props.apiHost}/username`, {credentials: "include"}).then((response) => {
        if (response.status === 200) {
          console.log("Already logged in. Redirecting to app page.");
          location.assign("/app.html");
        }
      });
    }
  }, []);

  return (
    <StaticPage>
      <Head>
        <title>Thinktool &ndash; Log In</title>
      </Head>
      <main className="login">
        <div className="block wide centered">
          <div className="horizontal">
            <div className="box">
              <form action={`${props.apiHost}/login`} method="POST">
                <div className="entry">
                  <label htmlFor="login-user">Username</label>
                  <input
                    type="text"
                    id="login-user"
                    placeholder="e.g. 'username123'"
                    name="user"
                    maxLength={32}
                    required
                  />
                </div>
                <div className="entry">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="e.g. 'correct horse battery staple'"
                    name="password"
                    maxLength={256}
                    required
                  />
                </div>
                <a className="forgot-password" href="forgot-password.html">
                  Forgot your password?
                </a>
                <div className="submit">
                  <i className="fas fa-sign-in-alt" /> <input type="submit" value="Log in" />
                </div>
              </form>
            </div>

            <div className="box">
              <form action={`${props.apiHost}/signup`} method="POST">
                <div className="entry">
                  <label htmlFor="signup-user">Username</label>
                  <input
                    type="text"
                    id="signup-user"
                    placeholder="e.g. 'username123'"
                    name="user"
                    maxLength={32}
                    pattern="[a-z][a-z0-9]*"
                    required
                  />
                  <div className="invalid-username">
                    Username may only contain lowercase letters and numbers. The first character must be a
                    letter.
                  </div>
                </div>
                <div className="entry">
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    placeholder="e.g. 'correct horse battery staple'"
                    type="password"
                    name="password"
                    maxLength={256}
                    required
                  />
                </div>
                <div className="entry">
                  <label htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    placeholder="e.g. 'user@example.com'"
                    type="email"
                    name="email"
                    maxLength={1024}
                    required
                  />
                </div>
                <div>
                  <input id="signup-newsletter" type="checkbox" name="newsletter" />
                  <label htmlFor="signup-newsletter">Also sign up for newsletter</label>
                </div>
                <div className="submit">
                  <i className="fas fa-user-check" /> <input type="submit" value="Sign up" />
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </StaticPage>
  );
}
