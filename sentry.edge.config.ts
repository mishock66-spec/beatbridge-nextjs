import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://2b8052f518e6ab069438f77c5b883d7b@o4511147327291392.ingest.de.sentry.io/4511147346034768",
  tracesSampleRate: 1,
  debug: false,
});
