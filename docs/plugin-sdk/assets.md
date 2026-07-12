# Assets

Declare package-relative asset paths in manifest metadata. Include them in package `files`; never include secrets. `hoak-plugin check` verifies declared assets exist and inventories their size and SHA-256 hash. Consumers should resolve assets relative to the installed package export.
