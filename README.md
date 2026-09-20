# headaches

Headaches is a simple Telegram bot for tracking headaches.
Report headaches by sending it a simple message.
The bot records each occurrence in an SQLite database.
You can later ask the bot to export the information for further analysis.

## Usage

The first message of the day is recorded as that day's entry, followed by a few structured questions (headache yes/no, symptoms if yes, neck stiffness, screen hours).
Type `skip` to skip the remaining questions.

Further messages the same day are stored as free-form follow-ups to that entry without re-asking the questions.
Type `new` right after a follow-up to answer the questions for it instead (e.g. a headache that started after the morning entry).

"Same day" is determined by the `TIMEZONE` environment variable (IANA name, defaults to `America/Los_Angeles`).

## Why a Telegram bot?

I wanted the simplest possible interface to remove any friction for reporting headaches.
A web app requires setting up some sort of authentication to prevent misuse.
A native app requires managing development provisioning profiles.
The Telegram bot is simpler: there's no need to install any new application and Telegram manages authentication for you.

## Deployment

You will need to tweak the deployment configuration slightly before deploying it for the first time:

1. Copy [config/deploy.yml.template](./config/deploy.yml.template) to [config/deploy.yml](./config/deploy.yml) and configure it appropriately.
1. Copy [.kamal/secrets.template](.kamal/secrets.template) to [.kamal/secrets](.kamal/secrets) and configure it appropriately.

Once Kamal has been configured, you deploy it with `kamal deploy`

