import Worker from "./Worker.js";
import StateManager from "./StateManager.js";
import TaskQueue from "./TaskQueue.js";
import { login } from "../modules/login.js";

export default class BotEngine {
  constructor(config) {
    this.config = config;
    this.worker = new Worker(config);
    this.stateManager = new StateManager();
    this.queue = new TaskQueue();
    this.villageStateCache = {};
  }

  updateVillageState(villageId,state){
    this.villageStateCache[villageId] = {
      ...state,
      lastUpdated: Date.now()
    }
  }
  getVillageState(villageId) {
  return this.villageStateCache[villageId] || null;
}

  /* async getHeroState(state){
     await this.worker.page.goto(
    `${this.config.serverUrl}/hero/attributes`
  );

  const hero = await this.stateManager.getHeroState(this.worker);
  const state = {
    ...state,
    hero
  }
  } */

 async processVillage(village) {

  // fielda git
  
  await this.goToField(village.newDid);

  // field state
  const economy = await this.stateManager.getEconomy(this.worker);
  const fields = await this.stateManager.getFields(this.worker);
  const buildQueue = await this.stateManager.getBuildQueue(this.worker);

  // hero state
 /*  await this.worker.page.goto(
    `${this.config.serverUrl}/hero/attributes`
  );

  const hero = await this.stateManager.getHeroState(this.worker); */
  await this.goToVillage(village.newDid);
  const center = await this.stateManager.getCenter(this.worker);

  // final state
  const state = {
    economy,
    fields,
    buildQueue,
    //hero,
    center,
    timestamp: Date.now()
  };

  // update cache
  this.updateVillageState(village.newDid, state);

  console.log(
    "CACHE:",
    JSON.stringify(this.villageStateCache, null, 2)
  );
}
async goToVillage(newDid) {
    await this.worker.page.goto(
    `${this.config.serverUrl}/dorf2.php?newdid=${newDid}`
  );
}


 async goToField(newDid) {
  await this.worker.page.goto(
    `${this.config.serverUrl}/dorf1.php?newdid=${newDid}`
  );
}

  async start() {
  await this.worker.launch();
  await login(this.worker, this.config);

  // village listi bir kere al
  const villages = await this.stateManager.getVillageList(this.worker);

  while (true) {
    console.log("=== NEW CYCLE ===");

    for (const village of villages) {
      await this.processVillage(village);
    }

    await new Promise(r => setTimeout(r, 20000));
  }
}

}
