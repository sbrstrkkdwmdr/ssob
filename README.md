# SSoB

A discord bot for osu! related stuff

<div align="center">

[![website](https://img.shields.io/badge/website-FFA41C?style=for-the-badge&logoColor=white)](https://ssob.sbrstrkkdwmdr.me)

[![CodeFactor](https://www.codefactor.io/repository/github/sbrstrkkdwmdr/ssob/badge)](https://www.codefactor.io/repository/github/sbrstrkkdwmdr/ssob)
[![license](https://img.shields.io/github/license/sbrstrkkdwmdr/ssob?label=license)](https://github.com/sbrstrkkdwmdr/ssob/LICENSE)
[![stars](https://img.shields.io/github/stars/sbrstrkkdwmdr/ssob)](https://github.com/sbrstrkkdwmdr/ssob)
[![lastcommit](https://img.shields.io/github/last-commit/sbrstrkkdwmdr/ssob)](https://github.com/sbrstrkkdwmdr/ssob)

[![changelog](https://img.shields.io/badge/Changelog-34A0DB)](https://github.com/sbrstrkkdwmdr/ssob/blob/main/changelog.md)
[![credits](https://img.shields.io/badge/Credits-AEDD35)](https://github.com/sbrstrkkdwmdr/ssob/blob/main/CREDITS.md)
[![todo](https://img.shields.io/badge/To_Do_List-E05735)](https://github.com/sbrstrkkdwmdr/ssob/blob/main/todo.md)

[![discordjs](https://img.shields.io/badge/DiscordJS-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/#/)
[![typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/microsoft/TypeScript)
[![sequelize](https://img.shields.io/badge/Sequelize-02AFEF?style=for-the-badge&logo=sequelize&logoColor=white)](https://sequelize.org/)
[![nodejs](https://img.shields.io/badge/NodeJS-83CD29?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en/)
[![chartjs](https://img.shields.io/badge/chartjs-FE777B?style=for-the-badge&logo=chart.js&logoColor=white)](https://www.chartjs.org/)
[![express](https://img.shields.io/badge/express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

</div>

## Install/setup

Requires both NodeJS and Rust (for rosu-pp-js)

install NodeJS [here](https://nodejs.org/en/download/)

install Rust [here](https://www.rust-lang.org/tools/install)

install all dependencies with `npm i` in the main directory

in the `./config/` folder rename `tempconfig.json` to `config.json`

`config.json` should look like this:

```json
{
    "token": "xxx",
    "osu": {
        "clientId": "xxx",
        "clientSecret": "xxx"
    },
    "prefix": "xxx",
    "owners": ["xxx"],
    "emojiGuild": "12345",
    "tenorKey": "xxx",
    "enableTracking": true,
    "port": 80
    "logs": {
        "console": true,
        "file": true
    }
}
```

change the values in `config.json` (see [here](#config-properties))  

rename `TEMPLATE.sqlite` to `database.sqlite` 

add the bot to an empty server and give it `create+manage expressions` permissions. Make sure there are no emojis in this server.

## Deployment

to compile the bot the bot use `tsc` or `npm run build`

to run the bot use `npm run run` 

to run the docs use `npm run run-web` 

to run both the bot and docs simultaneously use `npm run run-full`


## required permissions

disabling these permissions will disable the commands listed

| Permission    | Usage                                                     | Affected Commands |
| ------------- | --------------------------------------------------------- | ----------------- |
| EmbedLinks    | Most commands display information via the use of _embeds_ | All commands      |
| Administrator | To access certain data                                    | checkperms, find  |

## Config Properties

| Property       | Type     | Description                                                                                                                                                                                           |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| token          | string   | application token for bot to connect to discords API. </br>go to https://discord.com/developers/applications, create a new app, and create a new bot under the bot section. copy the token from there |
| osu            | object   | see [here](#config-osu-properties)                                                                                                                                                                    |
| prefix         | string   | a string at the start of each message to detect if a message is a command. eg. `!` => `!ping` would ping the bot and `?ping` or `ping` wouldn't.                                                      |
| owners         | string[] | an array of user ids stored as strings. users with these ids can use any command                                                                                                                      |
| emojiGuild     | string   | ID of the guild to store emojis. Make sure the bot has create and manage expressions permissions in this server                                                                                       |
| tenorKey       | string   | Used for running gif commands (hug, punch, slap). see [here](https://developers.google.com/tenor/guides/quickstart)                                                                                   |
| port           | number   | Used to host the documentation. Access via `localhost:{port}`                                                                                                                                         |
| enableTracking | boolean  | Enables/disables osu!track                                                                                                                                                                            |
| logs           | object   | see [here](#config-logging-properties)                                                                                                                                                                |

### Config osu properties

| Property     | Type   | Description                                                                                             |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| clientId     | string | the client id of an osu! api v2 app. [Create client here](https://osu.ppy.sh/home/account/edit#oauth)   |
| clientSecret | string | the secret/token of an osu! api v2 app [Create client here](https://osu.ppy.sh/home/account/edit#oauth) |

### Config logging properties

| Property | Type    | Description                                          |
| -------- | ------- | ---------------------------------------------------- |
| console  | boolean | Logs are output to the console                       |
| file     | boolean | Logs are saved to the logs folder (`dist/src/logs/`) |
