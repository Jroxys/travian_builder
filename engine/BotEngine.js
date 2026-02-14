import Worker from "./Worker.js";
import StateManager from "./StateManager.js";
import TaskQueue from "./TaskQueue.js";
import { login } from "../modules/login.js";
import TaskManager from "./TaskManager.js";

export default class BotEngine {
  constructor(config) {
    this.config = config;
    this.worker = new Worker(config);
    this.stateManager = new StateManager();
    this.taskManager = new TaskManager();
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
 async goToVillage(newDid) {
  await this.worker.page.goto(
    `${this.config.serverUrl}/dorf2.php?newdid=${newDid}`
  );
}

 async processVillage(village) {

  // fielda git
  
  await this.goToField(village.newDid);

  // field state
  const economy = await this.stateManager.getEconomy(this.worker);
  const fields = await this.stateManager.getFields(this.worker);
  const buildQueue = await this.stateManager.getBuildQueue(this.worker);

  await this.goToVillage(village.newDid);
  const buildings = await this.stateManager.getBuildings(this.worker);

  // final state
  const state = {
    economy,
    fields,
    buildQueue,
    //hero,
    buildings,
    timestamp: Date.now()
  };

  // update cache
  this.updateVillageState(village.newDid, state);


  await this.handleTasks(village.newDid, state);
  
  

}
async handleTasks(villageId, state) {
    if (state.buildQueue.length >= 2) {
  console.log("Queue full, skipping tasks.");
  return;
}


  const tasks = this.taskManager.getTasksForVillage(villageId);
 

  for (const task of tasks) {
    // evaluate yapıyon zaten amınaaa
    const decision = this.taskManager.evaluate(task, state);


    if (decision) {
      console.log("Executing task:", task.type, "for village:", villageId);
      console.log("Decision:", decision);
      await this.execute(decision,villageId);
      break;
    }else{
      console.log("No valid decision for task:", task.type, "in village:", villageId);
    }
  }
}

// execute task
async execute(decision,villageId) {

  if (decision.action === "upgrade_field") {
    console.log("upgrade fielda girdim");
    await this.worker.page.goto(
      `${this.config.serverUrl}/dorf1.php?newdid=${villageId}`
    );

    await this.upgradeField(decision.slotId);
  }

  else if (decision.action === "upgrade_building") {
    console.log("upgrade buildinge girdim");

    await this.worker.page.goto(
      `${this.config.serverUrl}/dorf2.php?newdid=${villageId}`
    );

    await this.upgradeBuilding(decision.slotId);
  }else{
    console.log("Unknown decision type:", decision.type);
  }
}
async upgradeField(slotId,gid) {
  console.log("Upgrading field slot:", slotId);

  const page = this.worker.page;

  const fieldUrl = `${this.config.serverUrl}/build.php?id=${slotId}&amp;gid=${gid}`;
  await page.goto(fieldUrl);

  await page.waitForLoadState("networkidle");
  const buildBtn = page.locator("button.green.build");

  if (await buildBtn.count() > 0) {
    await buildBtn.first().click();
    console.log("Field upgrade started.");
  } else {
    console.log("Upgrade not available.");
  }
}
async upgradeBuilding(slotId,gid) {

  console.log("Upgrading building slot:", slotId);

  const page = this.worker.page;

  const buildingUrl = `${this.config.serverUrl}/build.php?id=${slotId}&amp;gid=${gid}`;
  await page.goto(buildingUrl);

  await page.waitForLoadState("networkidle");
  const buildBtn = page.locator("button.green.build");

  if (await buildBtn.count() > 0) {
    await buildBtn.first().click();
    console.log("Building upgrade started.");
  } else {
    console.log("Upgrade not available.");
  }
}
async ensurePage(type) {

  const url = this.worker.page.url();

  if (type === "dorf1" && !url.includes("dorf1")) {
    await this.worker.page.goto(this.config.serverUrl+"/dorf1.php");
  }

  if (type === "dorf2" && !url.includes("dorf2")) {
    await this.worker.page.goto(this.config.serverUrl+"/dorf2.php");
  }
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
