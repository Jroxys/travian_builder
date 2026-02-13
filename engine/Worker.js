import {chromium} from 'playwright';

export default class Worker {
    constructor(config){
        this.config = config
        this.browser = null
        this.page = null
    }

    async launch(){
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();

    }

    async close(){
        await this.browser.close();
    }
}