import Worker from "./Worker.js";
import StateManager from "./StateManager.js";
import TaskManager from "./TaskManager.js";
import { login } from "../modules/login.js";
import { randomDelay } from "../utils/delay.js";

export default class BotEngine {

  constructor(config) {
    this.config = config;
    this.worker = new Worker(config);
    this.stateManager = new StateManager();
    this.taskManager = new TaskManager();
    this.villageStateCache = {};
  }

  updateVillageState(villageId, state) {
    this.villageStateCache[villageId] = {
      ...state,
      lastUpdated: Date.now()
    };
  }

  getVillageState(villageId) {
    return this.villageStateCache[villageId] || null;
  }

  async collectVillageState(villageId) {

    console.log(`\nCollecting state for village ${villageId}`);
    await this.goToHeroState();
    const heroState = await this.stateManager.getHeroAttiributes(this.worker);

    await this.goToAdventures();
    const heroAdventures = await this.stateManager.getHeroAdventures(this.worker);

    await this.goToField(villageId);

    const economy = await this.stateManager.getEconomy(this.worker);
    const fields = await this.stateManager.getFields(this.worker);
    const buildQueue = await this.stateManager.getBuildQueue(this.worker);

    await this.goToVillage(villageId);

    const buildings = await this.stateManager.getBuildings(this.worker);

    const state = {
      economy,
      fields,
      buildQueue,
      buildings,
      heroState,
      heroAdventures,
      timestamp: Date.now()
    };

    this.updateVillageState(villageId, state);

    return state;
  }

  async processVillage(village) {

    console.log(`\n=== Processing village ${village.newDid} ===`);

    let continueVillage = true;

    while (continueVillage) {

      const state = await this.collectVillageState(village.newDid);

      if (state.buildQueue.length >= 2) {
        console.log("Queue full. Skipping village.");
        return;
      }

      const tasks = this.taskManager.getTasksForVillage(village.newDid);

      let executedSomething = false;

      for (const task of tasks) {

        const decision = this.taskManager.evaluate(task, state);

        if (!decision) continue;

        console.log("Executing task:", task.type);

        const success = await this.execute(decision, village.newDid);

        if (success) {
          executedSomething = true;
          break; // state değişti → tekrar değerlendir
        }
      }

      if (!executedSomething) {
        continueVillage = false;
        console.log("No executable tasks left for village.");
      }
    }
  }

  async execute(decision, villageId) {

    try {

      if (decision.action === "upgrade_field") {

        await this.goToField(villageId);
        return await this.upgradeField(decision.slotId);

      }

      if (decision.action === "upgrade_building") {

        await this.goToVillage(villageId);
        return await this.upgradeBuilding(decision.slotId);

      }

      console.log("Unknown action:", decision.action);
      return false;

    } catch (err) {
      console.log("Execution error:", err.message);
      return false;
    }
  }

  async upgradeField(slotId) {

    const page = this.worker.page;

    console.log("Upgrading field slot:", slotId);

    await page.goto(`${this.config.serverUrl}/build.php?id=${slotId}`);

    await page.waitForLoadState("networkidle");

    const buildBtn = page.locator("button.green.build");

    if (await buildBtn.count() > 0) {
      await buildBtn.first().click();
      console.log("Field upgrade started.");
      return true;
    }

    console.log("Field upgrade not available.");
    return false;
  }

  async upgradeBuilding(slotId) {

    const page = this.worker.page;

    console.log("Upgrading building slot:", slotId);

    await page.goto(`${this.config.serverUrl}/build.php?id=${slotId}`);

    await page.waitForLoadState("networkidle");

    const buildBtn = page.locator("button.green.build");

    if (await buildBtn.count() > 0) {
      await buildBtn.first().click();
      console.log("Building upgrade started.");
      return true;
    }

    console.log("Building upgrade not available.");
    return false;
  }
  async buildNewBuilding(slotId){
        const page = this.worker.page;

    console.log("New building slot:", slotId);
    await page.goto(`${this.config.serverUrl}/build.php?id=${slotId}`);
    await page.waitForLoadState("networkidle");

  }

  async goToField(newDid) {
    await this.worker.page.goto(
      `${this.config.serverUrl}/dorf1.php?newdid=${newDid}`
    );
  }

  async goToVillage(newDid) {
    await this.worker.page.goto(
      `${this.config.serverUrl}/dorf2.php?newdid=${newDid}`
    );
  }
  async goToHeroState(){
  
    await this.worker.page.goto(`${this.config.serverUrl}/hero/attributes`);
  }
  async goToAdventures(){
    await this.worker.page.goto(`${this.config.serverUrl}/hero/adventures`,{waitUntil: "networkidle"});
  }

  async start() {

    await this.worker.launch();
    await login(this.worker, this.config);

    const villages = await this.stateManager.getVillageList(this.worker);

    while (true) {

      console.log("\n====================");
      console.log("=== NEW CYCLE ===");
      console.log("====================");

      for (const village of villages) {
        await this.processVillage(village);
      }
    

      await randomDelay(20000, 120000);
    }
  }
}


// heroyu maceraya yollama işi health çektiken sonra eğer canı 30'un üstündeyse yollasın
// empty slota bina yapma işi ekleme
