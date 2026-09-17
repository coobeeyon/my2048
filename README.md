# My2048

Initial Expo React Native scaffold for the My2048 phone app.

## Run locally

Install dependencies:

```sh
npm install
```

Start the Expo development server:

```sh
npm start
```

From the Expo dev server, open the app in Expo Go, an Android emulator, an iOS simulator, or the web target.

## Persistence checks

`npm test` checks game rules and stored-data validation. `npx tsc --noEmit`
checks types. Browser acceptance uses the actual exported web app:

```sh
npx expo export --platform web
npx playwright install chromium
python3 -m http.server 18748 --bind 127.0.0.1 --directory dist
```

With that local server running, run `npm run test:browser` in another terminal.
Set `PROOF_URL` to use a different local test server. The checks use fresh browser
contexts and synthetic local saves. They cover reload, reset, score and outcome
retention, damaged saves, a deliberately delayed storage read, ordered writes,
and preservation of an existing save when reading storage fails.

These checks exercise the shared app through React Native Web. They do not
replace an iOS/Android device check before distributing a native build.
