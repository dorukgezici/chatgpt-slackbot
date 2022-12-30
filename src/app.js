import dotenv from 'dotenv';
import ChatGptClient from './chatgpt-client.js';
import ChatGtpSlackBot from './slackbot.js';

dotenv.config();

async function main() {
    // Slack Bot
    if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN) {
        throw new Error('Missing slack token');
    }

    const slackBot = new ChatGtpSlackBot({
        slackBotToken: process.env.SLACK_BOT_TOKEN,
        slackAppToken: process.env.SLACK_APP_TOKEN,
    });

    // ChatGPT Client
    if (!process.env.CHATGPT_EMAIL || !process.env.CHATGPT_PASSWORD) {
        throw new Error('Missing email / password');
    }

    const chatGptClient = new ChatGptClient(0, {
        accEmail: process.env.CHATGPT_EMAIL,
        accPassword: process.env.CHATGPT_PASSWORD,
        isGoogleLogin: Boolean(Number(process.env.CHATGPT_IS_GOOGLE_LOGIN)),
        proxyServer: process.env.CHATGPT_PROXY_SERVER,
        requestTimeoutMs: Number(process.env.CHATGPT_REQUEST_TIMEOUT_MS || 300000),
        queueIntervalMs: Number(process.env.QUEUE_INTERVAL_MS || 3000),
    });

    chatGptClient.setCallbacks(async (answer, question, slackMeta) => {
        await slackBot.replyAnswer(answer, question, slackMeta);
    }, async (error, question, slackMeta) => {
        await slackBot.replyError(error, question, slackMeta);
    });

    await chatGptClient.startChatGptSession();

    // Listen on Slack
    await slackBot.listen(chatGptClient);
}

main()
    .catch(err => console.error(err));
