function MyApp(props: {Component: React.ComponentType; pageProps: object}) {
  return <props.Component {...props.pageProps} />;
}

export default MyApp;
