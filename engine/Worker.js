import { chromium } from "playwright";

export default class Worker {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

async launch() {
  const launchOptions = {
    headless: false
  };
  console.log("Proxy config:", this.config.proxy);


  if (this.config.proxy) {
    launchOptions.proxy = this.config.proxy;
  }

  this.browser = await chromium.launch(launchOptions);

  const contextOptions = {};

  if (this.config.fingerprint) {
    contextOptions.userAgent = this.config.fingerprint.userAgent;
    contextOptions.viewport = this.config.fingerprint.viewport;
    contextOptions.locale = this.config.fingerprint.locale;
    contextOptions.timezoneId = this.config.fingerprint.timezoneId;
  }

  this.context = await this.browser.newContext(contextOptions);
  this.page = await this.context.newPage();
}

  async close() {
    await this.browser.close();
  }
}
