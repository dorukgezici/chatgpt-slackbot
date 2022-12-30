import { ChatGPTAPIBrowser } from 'chatgpt';

/**
 * @typedef ChatGptClientArgs
 * @property {string} accEmail
 * @property {string} accPassword
 * @property {boolean} [isGoogleLogin]
 * @property {string|undefined} [proxyServer]
 * @property {number} [requestTimeoutMs]
 * @property {number} [queueIntervalMs]
 */

/**
 * @typedef ChatGptQuestion
 * @property {string} prompt
 * @property {string} [conversationId]
 * @property {string} [parentMessageId]
 */

/**
 * @typedef ChatGptAnswer
 * @property {string} response
 * @property {string} conversationId
 * @property {string} messageId
 */

/**
 * @callback AnswerCallback
 * @param {ChatGptAnswer} answer
 * @param {ChatGptQuestion} question
 * @param {SlackMeta} slackMeta
 */

/**
 * @callback ErrorCallback
 * @param {Error} err
 * @param {ChatGptQuestion} question
 * @param {SlackMeta} slackMeta
 */

class ChatGptClient {
    /**
     * @param {number} clientId
     * @param {ChatGptClientArgs} args
     */
    constructor(clientId, args) {
        this.clientId = clientId;
        this.chatApi = new ChatGPTAPIBrowser({
            email: args.accEmail,
            password: args.accPassword,
            proxyServer: args.proxyServer ?? undefined,
            isGoogleLogin: args.isGoogleLogin ?? false,
            executablePath: '/usr/bin/chromium',
        });

        /** @type {number} */
        this.requestTimeoutMs = args.requestTimeoutMs ?? 5 * 60 * 1000;

        /** @type {number} */
        this.queueIntervalMs = args.queueIntervalMs ?? 3000;

        /** @type {AnswerCallback} */
        this.answerCallback = null;

        /** @type {ErrorCallback} */
        this.errorCallback = null;
    }

    /**
     * @param {AnswerCallback} answerCallback
     * @param {ErrorCallback} errorCallback
     */
    setCallbacks(answerCallback, errorCallback) {
        this.answerCallback = answerCallback;
        this.errorCallback = errorCallback;
    }

    /**
     * Ask ChatGPT asyncrhonously
     * @param {ChatGptQuestion} question
     * @param {SlackMeta} slackMeta
     * @param {number} [clientId]
     * @return {Promise<ChatResponse>}
     */
    async ask(question, slackMeta, clientId) {
        try {
            const answer = await this._handleAsk(question, true);
            await this.answerCallback(answer, question, slackMeta);
        } catch (err) {
            await this.errorCallback(err, question, slackMeta);
        }
    }

    /**
     * Start a headless browser to connect and login to chatgpt
     * @returns {Promise<void>}
     */
    async startChatGptSession() {
        console.log('Start connecting ChatGPT session...');
        try {
            await this.chatApi.initSession();
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }

    /**
     * @param {ChatGptQuestion} question
     * @param {boolean} shouldRetry
     * @returns {ChatGptAnswer}
     */
    async _handleAsk(question, shouldRetry) {
        try {
            console.log(`[${new Date().toISOString()}] chatgpt_request ${JSON.stringify({
                question,
                shouldRetry
            })}`);

            const result = await this.chatApi.sendMessage(question.prompt, {
                conversationId: question.conversationId,
                parentMessageId: question.parentMessageId,
                timeoutMs: this.requestTimeoutMs,
            });
            console.log(`[${new Date().toISOString()}] chatgpt_response ${JSON.stringify(result)}`);
            return result;

        } catch (err) {
            console.log(`[${new Date().toISOString()}] chatgpt_error ${JSON.stringify({ err })}`);

            if (shouldRetry && err.message?.includes('403')) {
                console.log(`[${new Date().toISOString()}] chatgpt_refresh_session`);
                await this.chatApi.refreshSession();
                await new Promise(r => setTimeout(r, 10000));
                return await this.ask(question, false);
            } else {
                throw err;
            }
        }
    }
}

export { ChatGptClient as default };
