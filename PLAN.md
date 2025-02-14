# PLAN

## Installation
Installation has to be done outside Discord, all we can do is link to the page.

We can't provide any sort of state to this phase of the installation to link to
the Discord account that called this command.
- User runs `/install` command
  ```
  Click here to install the application (https://github.com/apps/...)
  ```
- App receives installation webhook, persists installation info
- User directed to postauth page:
```
  Installation complete
  Run /link to link this installation to your Discord account
```

## Linking Discord account
We need to do some sort of oauth flow to confirm the discord user owns the
github installation.
  https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- User runs `/link` command
- App generates random state, stores in KV
  - keyed by state
  - short TTL (15m?)
  - attaches discord user ID
- Send link to github URL with state
  ```
  Click here to link your account to the installation (https://github.com/oauth/...?state=...)
  ```

- User follows flow, redirected to postauth page with code and state
- Check state, if valid confirm github user ID with code
- link github entity ID -> discord username
  (note: we should be able to have multiple accts owned by one username, because orgs)

## Update publishing

- App receives webhook for push/release event
  - checks for configuration entry with matching repository id
  - if present, check to see if should publish event based on configuration
  - if should publish event, publish embed to configured channel!

## Configuration
### MVP
> simple opt in/out for each repo

#### Subscribing
  - User runs `/subscribe repo:<github url>` to opt-in a repo they own
  - App retrieves metadata:
    - finds installations associated with discord ID
    - tries to fetch repo with installation token
    - returns data from first successful request
  - App ensures discord user ID is linked with github user ID of owning entity
    - TODO post mvp: should we re-confirm ownership where user id != entity id?
  - Upserts entry into subscription table, notes default branch
    - default branch can be updated be re-subscribing (overwrites)
  - Replies with embed that says updates with be published, show default branch

#### Unsubscribing
  - User runs `/unsubscribe repo:<github url>`
  - App finds metadata:
    - find installations associated with discord ID
    - fetches repo with each installation token until one is successful
  - App ensures discord user ID is linked with github user ID of owning entity
  - App removes entry from DB subscription table for repo with that ID
  - Replies with embed that says updates will no longer be published

### Post-MVP
> rich configurations, more than just pushes/tags
  - User should be able to configure:
    - Notify on releases [yes/no]
      - Show pre-releases [yes/no]
    - Notify for pushes [yes/no]
      - Branch patterns to notify for (js regexp?)
    TODO: determine best way to configure?
    - inline component form? (update API is very unfriendly)
    - modal? (only supports text input components)
    - temporary code and shitty react app? (ugh, now i have another js app to worry about)

  - User runs `/configure` to configure webhooks for a repo
  - App receives submission event for repo, upserts entry in table with
    configuration information
