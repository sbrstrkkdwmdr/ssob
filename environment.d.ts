declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DISCORD_TOKEN: string;
            OSU_CLIENT_ID: string;
            OSU_CLIENT_SECRET: string;
            TENOR_KEY: string;
        }
    }
}

export { };

