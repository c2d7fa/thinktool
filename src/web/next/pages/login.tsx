import Head from "next/head";
import * as React from "react";

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
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>Thinktool &ndash; Log In</title>
        <link rel="stylesheet" href="/index.css" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header id="top-bar">
        <span id="logo">Thinktool</span>
      </header>
      <main className="login">
        <div>
          <h1>Log in.</h1>
          <form action={`${props.apiHost}/login`} method="POST">
            <div className="form-table">
              <div className="entry">
                <label htmlFor="login-user">Username</label>
                <input id="login-user" name="user" maxLength={32} required />
              </div>
              <div className="entry">
                <label htmlFor="login-password">Password</label>
                <input id="login-password" type="password" name="password" maxLength={256} required />
              </div>
            </div>
            <input type="submit" value="Log in" />
          </form>
          <a className="forgot-password" href="forgot-password.html">
            Forgot your password?
          </a>
        </div>

        <div>
          <h1>Sign up.</h1>
          <form action={`${props.apiHost}/signup`} method="POST">
            <div className="form-table">
              <div className="entry">
                <label htmlFor="signup-user">Username</label>
                <input
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
            </div>
            <div className="newsletter-signup">
              <input id="signup-newsletter" type="checkbox" name="newsletter" />
              <label htmlFor="signup-newsletter">Also sign up for newsletter</label>
            </div>
            <input type="submit" value="Sign up" />
          </form>
        </div>

        <aside className="disclaimer">
          <h1>Thank you for trying Thinktool!</h1>
          <p>
            I'm working on Thinktool in my free time, and I use it every day. However, it's currently
            preview-quality software. If you decide to try it out anyway, I would love to hear from you. Send
            me feedback, bug reports, questions, or anything else at
            <a className="email" href="mailto:jonas@thinktool.io">
              <span>jonas@thinktool.io</span>
            </a>
            . Also feel free to message me if you need help with anything.
          </p>
        </aside>
      </main>

      <script
        data-goatcounter="https://thinktool.goatcounter.com/count"
        async
        src="//gc.zgo.at/count.js"></script>
    </>
  );
}
