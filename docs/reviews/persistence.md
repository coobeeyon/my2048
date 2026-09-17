# Local persistence review

## Architecture: approve

The defining outcome in `SPEC.md` (Persistence) is to resume the board, current
score, best score, and win/game-over state using device-local storage. One
versioned record through the existing AsyncStorage dependency is sufficient.
There is no account, server, cloud sync, or migration requirement. The app
uses only `getItem` and `setItem`; the installed AsyncStorage web implementation
resolves its Promise after localStorage access. Its native implementation is
asynchronous, so input and save ordering cannot depend on immediate reads.

Review of original commit `1510cb2` found the correct architecture but an
ungated load: New Game, buttons, and keyboard could mutate the temporary game
before restoration replaced it. The same delayed-read browser assertion fails
on an export built from that exact commit and passes on the corrected app.

The correction gates play until restoration resolves, uses a rendered loading
state, serializes writes, and avoids replacing an inaccessible save after a
read failure. Invalid saved shapes and non-2048 tile values fall back to a new
game. These are corrections within the existing persistence outcome.

## Feature fitness: fit for source integration

Defining sources: `SPEC.md` Persistence and User Experience. Implementation:
`App.tsx`, `src/game/persistence.ts`, and the existing game engine. Proof:
`src/game/engine.test.ts`, `src/game/persistence.test.ts`, and
`tests/browser/persistence*.cjs`. The earlier wiki test reports were contextual
leads, not accepted as proof; checks were rerun.

| Requirement | Implementation | Proof and limit |
| --- | --- | --- |
| Resume board/current score | Startup restore and state save in App | Exported-app move/reload checks compare the entire saved game |
| Retain best score across resets | Maximum restored/current score; reset only game | Browser reset/reload retains best 100 and score 0 |
| Retain won/game-over state | Whole GameState record | Browser restores and displays both outcomes |
| Keep storage local | AsyncStorage versioned key | Browser localStorage round trip; no backend introduced |
| New game remains playable | Existing engine; input enabled after load resolution | Reset has exactly two tiles; engine tests cover rules |
| A late load must not undo accepted play | Loading state gates buttons, swipe callback and keyboard callback | Delayed-read browser test checks disabled buttons and ignored keyboard before release; original commit fails |
| Final save reflects latest move/reset | Ordered Promise chain | Held initial write followed by move/reset drains to reset state |
| Read failure must not destroy saved progress | Unavailable state allows play without writes | Injected read failure, move/reset, original record unchanged |
| Corrupt data must not enter engine | Validated shape, finite safe integer scores, power-of-two tiles | Parser cases and malformed/invalid-tile browser recovery |

All 15 engine/parser tests, TypeScript, web export, and the two browser suites
passed. No unexpected browser errors occurred in the ordinary workflow.
Browser fault injection uses a Promise-delayed storage boundary; it is not a
claim of native hardware acceptance. No native binary was installed, published,
or verified. A physical-device check remains a release check before native
distribution, separate from this source-integration task.

The review began independently of the original implementation. Its corrections
and final checks were performed by the same agent; no separate reviewer of those
corrections is claimed.
