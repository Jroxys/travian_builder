import Worker from "./Worker.js";
import StateManager from "./StateManager.js";
import TaskManager from "./TaskManager.js";
import { login } from "../modules/login.js";
import { randomDelay } from "../utils/delay.js";

export default class BotEngine {
  // maceraya gönderme yapılacak
  // optimize etmeye çalış her seferinde state almasın her seferinde hero checklemesin
  // bundan sonrası biraz detaylı optimize olmalı optimize tamamlandıktan sonra multi  denemeleri yapılsın.

  constructor(config) {
    this.config = config;
    this.worker = new Worker(config);
    this.stateManager = new StateManager();
    this.taskManager = new TaskManager();
    this.villageStateCache = {};
    this.heroCache = null;
    this.heroLastUpdated = 0;
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
      timestamp: Date.now()
    };

    this.updateVillageState(villageId, state);

    return state;
  }
  patchVillageState(villageId, decision) {

  const state = this.villageStateCache[villageId];
  if (!state) return;

  if (decision.action === "upgrade_field") {

    const field = state.fields.find(f => f.slotId === decision.slotId);
    if (field) {
      field.isUnderConstruction = true;
      state.buildQueue.push({ type: "field", slotId: decision.slotId });
    }
  }

  if (decision.action === "upgrade_building") {

    const building = state.buildings.find(b => b.slotId === decision.slotId);
    if (building) {
      building.isUnderConstruction = true;
      state.buildQueue.push({ type: "building", slotId: decision.slotId });
    }
  }

  if (decision.action === "new_building") {

    state.buildings.push({
      slotId: decision.slotId,
      gid: decision.gid,
      level: 1,
      isUnderConstruction: true
    });

    state.buildQueue.push({ type: "building", slotId: decision.slotId });
  }
}

  

  async processVillage(village) {

  console.log(`\n=== Processing village ${village.newDid} ===`);

  let state = await this.collectVillageState(village.newDid);

  let continueVillage = true;

  while (continueVillage) {

    const tasks = this.taskManager.getExecutableTasksForVillage(village.newDid,state);

    let executedSomething = false;

    for (const task of tasks) {

      const decision = await this.taskManager.evaluate(task, state);

      if (!decision) continue;

      console.log("Executing task:", task.type);

      const success = await this.execute(decision, village.newDid);

      if (success) {

        this.patchVillageState(village.newDid, decision);

        executedSomething = true;
        break;
      }
    }

    if (!executedSomething) {
      continueVillage = false;
      console.log("No executable tasks left for village.");
    }
  }
}


  async execute(decision, villageId) {
    console.log("Executing decision:", decision);

    try {

      if (decision.action === "upgrade_field") {

        await this.goToField(villageId);
        return await this.upgradeField(decision.slotId);

      }

      if (decision.action === "upgrade_building") {

        await this.goToVillage(villageId);
        return await this.upgradeBuilding(decision.slotId);

      }
      if (decision.action === "new_building") {
        await this.goToVillage(villageId);
        return await this.buildNewBuilding(decision.slotId, decision.gid);
      }
      if (decision.action === "send_hero_adventure") {
          const success = await this.sendHeroToAdventure();
            if (success) {
              this.heroLastUpdated = 0; // invalidate
            }
            return success;
        }

      console.log("Unknown action:", decision.action);
      return false;

    } catch (err) {
      console.log("Execution error:", err.message);
      return false;
    }
  }
  async sendHeroToAdventure() {
        const hero = await this.collectHeroState();
        if (!hero) return false;

        await this.goToAdventures();

        const page = this.worker.page;
        const btn = page.locator("button.textButtonV2.green").first();
    

        if (await btn.count() > 0) {
          await btn.click();
          console.log("Hero sent to adventure.");

          // hero cache invalidate
          this.heroLastUpdated = 0;

          return true;
        }

        return false;
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
  // TEMP: using URL-based detection for upgrade/construct
// Will refactor to state-based decision later

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
async buildNewBuilding(slotId, gid) {

  const page = this.worker.page;

  console.log("Constructing new building:", gid, "in slot:", slotId);

  await page.goto(
    `${this.config.serverUrl}/build.php?id=${slotId}`
  );

  await page.waitForLoadState("networkidle");

  const contractWrapper = page.locator(`#contract_building${gid}`);
  const buildBtn = contractWrapper.locator("button.green.new");

  if (await buildBtn.count() > 0) {
    await buildBtn.first().click();
    console.log("New building construction started.");
    return true;
  }

  console.log("New building not available.");
  return false;
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
    await this.worker.page.goto(`${this.config.serverUrl}/hero/attributes`)
  }
    async goToAdventures(){
    await this.worker.page.goto(`${this.config.serverUrl}/hero/adventures`)
  }
  async collectHeroState(force = false) {

    const now = Date.now();

      if (!force && this.heroCache && (now - this.heroLastUpdated < 180000)) {
        return this.heroCache;
      }

      console.log("Refreshing hero state...");

      await this.goToHeroState();
      const heroState = await this.stateManager.getHeroAttiributes(this.worker);

      await this.goToAdventures();
      const heroAdventures = await this.stateManager.getHeroAdventures(this.worker);
      

      this.heroCache = {
        ...heroState,
        adventures: heroAdventures
      };
      this.heroLastUpdated = now;

      return this.heroCache;
} 

 async processHeroTasks() {

  const state = this.heroCache;

  const tasks = this.taskManager.getExecutableTasksForHero();

  for (const task of tasks) {

    const decision = await this.taskManager.evaluate(task, state);

    if (!decision) continue;

    console.log("Executing hero task:", task.type);

    const success = await this.execute(decision);

    if (success) {
      this.heroLastUpdated = 0; 
      break;
    }
  }
}

  
  async start() {

    await this.worker.launch();
    await login(this.worker, this.config);
   
    const villages = await this.stateManager.getVillageList(this.worker);

    while (true) {

      console.log("\n====================");
      console.log("=== NEW CYCLE ===");
      console.log("====================");
      const hero = await this.collectHeroState();
      await this.processHeroTasks();
      for (const village of villages) {
        await this.processVillage(village , hero);
      }
      await randomDelay(20000, 120000);
    }
  }
}


// heroyu maceraya yollama işi health çektiken sonra eğer canı 30'un üstündeyse yollasın
// empty slota bina yapma işi ekleme
