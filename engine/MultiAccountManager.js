import BotEngine  from "./botEngine.js";
import { chromium } from "playwright";

import fs  from "fs";
import { randomDelay } from "../utils/delay.js";

export default class MultiAccountManager {
    constructor(config){
        this.config=config;
        this.browser = null;    
        this.bots = [];
        this.running = false;
    }
    async initBrowser(){
        this.browser =  await chromium.launch({headless:false})
    }

    async startAll(){
        console.log("Starting multi-account system.")
        this.running = true;
        for (const account of  this.config.accounts){
            this.launchAccount(account)
        }

    }
launchAccount(accountConfig) {
    console.log(`[${accountConfig.name}] Initializing bot...`);

    const bot = new BotEngine(accountConfig);

    this.bots.push({
        name: accountConfig.name,
        instance: bot,
        status: "running"
    });
    // await olursa hata olur sadece 1 account başlatılır
    bot.start().catch(err => {
        console.error(`[${accountConfig.name}] Bot crashed:`, err.message);

        //açılmayan browser'i   kapattıktan sonra tekrar restart etsinn
        bot.worker.close();
        randomDelay(1000,5000)
        this.restartAccount(accountConfig);
    });
}

  async restartAccount(accountConfig) {
    console.log(`[${accountConfig.name}] Restarting in 10 seconds...`);

    setTimeout(() => {
      if (this.running) {
        this.launchAccount(accountConfig);
      }
    }, 10000);
  }

  async stopAll() {
    console.log("🛑 Stopping all bots...");
    this.running = false;

    for (const bot of this.bots) {
      if (bot.instance && bot.instance.stop) {
        await bot.instance.stop();
      }
    }
  }
    }

