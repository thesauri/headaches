# headaches

Headaches is a simple Telegram bot for tracking headaches.
Report headaches by sending it a simple message.
The bot records each occurrence in an SQLite database.
You can later ask the bot to export the information for further analysis.

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

