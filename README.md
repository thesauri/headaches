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

Deploy it to your own VPS using [Kamal](https://kamal-deploy.org/).

