# Plugin SDK quickstart

Requirements: Node 22+, ESM, npm.

```sh
npx @hoakbot/plugin-sdk@4.0.0-next.0 create my-plugin
cd my-plugin
npm install
npx hoak-plugin validate hoakbot.plugin.json
npx hoak-plugin preflight .
npx hoak-plugin check .
npx hoak-plugin pack .
```

The manifest is JSON and validation never imports the plugin factory. `inspect --json` recursively redacts secret-like keys. See [concepts](concepts.md), [recipes](recipes.md), [security](security.md), [assets](assets.md), [testing](testing.md), [packaging](packaging.md), [operations](operations.md), [compatibility](compatibility.md), [release policy](release-policy.md), [migration](migration.md), and [API](api.md).
