import fs, { stat } from "fs";
import { type } from "os";

export default class TaskManager {

  constructor() {
    this.tasks = [];
    this.loadTasks();
  }

  loadTasks() {
    const raw = fs.readFileSync("./config/tasks.json");
    this.tasks = JSON.parse(raw);
  }
  
  getTasksForHero(){
    return this.tasks.filter(
      t => t.type === ("send_hero_adventure")
    ).sort((a, b) => a.priority - b.priority)
  }

 getTasksForVillage(villageId) {
  return this.tasks.filter(
    t =>
      t.status === "active" &&
      String(t.villageId) === String(villageId)
  ) .sort((a, b) => a.priority - b.priority);
  }


  evaluate(task, state) {

    switch (task.type) {
      case "upgrade_building":
        return this.evaluateUpgradeBuilding(task, state);
      case "upgrade_field":
        return this.evaluateUpgradeField(task, state);
      case "new_building":
        return this.evaluateNewBuilding(task, state);
      case "send_hero_adventure":
        return this.evaulateHeroAdventure(task,state);
      default:
        console.log("Unknown task type:", task.type);
        return null;
    }     
  }

  getExecutableTasksForHero(){
    return this.getTasksForHero();
    
  }


  getExecutableTasksForVillage(villageId, state) {
  const tasks = this.getTasksForVillage(villageId);

  if (state.buildQueue.length >= 2) {
    return tasks.filter(t =>
      t.type !== "upgrade_field" &&
      t.type !== "upgrade_building" &&
      t.type !== "new_building"&&
      t.type !== "send_hero_adventure"
    );
  }

  return tasks;
}


  async evaulateHeroAdventure(task,state){
    if(!state) {return null;}
    const health = parseInt(state.health.replace(/[^0-9]/g, ""), 10)
     const availableAdventureIndex = state.adventures.findIndex(a => a.isAvailable === true);
  
    if (!state.adventures || state.adventures.length === 0)
    {
      console.log("0 Adventure")
      return null}
 
 

    if (availableAdventureIndex === -1) {
      console.log("No available adventure.");
      return null;
  }
      if (health < task.condition.minHealth) {
      console.log("Hero health too low.")
      return null};

    // sonra en kısa süreli ve en kolay adventureyi seç özelliği getir
    return {
      action: "send_hero_adventure",
      adventureIndex: availableAdventureIndex
    };
}




  async evaluateNewBuilding(task, state) {

  const slotId = Number(task.target.slotId);
  const gid = Number(task.target.gid);

  console.log("Evaluating NEW building for slot:", slotId, "gid:", gid);
  


  const sameBuildingInQueue = state.buildQueue.some(q =>
    q.name && q.name.toLowerCase().includes(
      (task.target.name || "").toLowerCase()
    )
  );

  if (sameBuildingInQueue) {
    console.log("Building already in queue");
    return null;
  }
  
    if (state.buildQueue.length >= 2) {
      console.log("Queue full. Skipping village.");
      return null;
    }

  console.log("New building task approved");

  return {
    action: "new_building",
    slotId: slotId,
    gid: gid
  };
}

  evaluateUpgradeBuilding(task, state) {

  const slotId = task.target.slotId;
  const maxLevel = task.condition.maxLevel;
 

const building = state.buildings.find(
  b => String(b.slotId) === String(slotId)
);

   const effectiveLevel = Number(building.level) + (building.isUnderConstruction ? 1 : 0);
   if (effectiveLevel >= maxLevel) {
    console.log("Task completed: max level reached");
    task.status = "completed";
    return null;
  }

  if (!building) {
    console.log("Task invalid: building not found");
    return null;
  }

  if (building.empty) {
    console.log("Task invalid: slot is empty");
    return null;
  }
    if (state.buildQueue.length >= 2) {
      console.log("Queue full. Skipping village.");
      return null;
    }

  if (Number(building.level) >= Number(maxLevel)) {
    console.log("Task completed: max level reached");
    task.status = "completed";
    return null;
  }

  if (!building.isBuildable) {
    console.log("Building not buildable right now");
    return null;
  }


  return {
    action: "upgrade_building",
    slotId: building.slotId
  };
}


  evaluateUpgradeField(task, state) {

    const slotId = task.target.slotId;
    console.log("Evaluating for slotId:", slotId);
    const maxLevel = task.condition.maxLevel;

    const field = state.fields.find(
      f => f.slotId === slotId
    );

    if (!field) {
      console.log("Task invalid: field not found");
      return null;
    }

    if (Number(field.level) >= Number(maxLevel)) {
      console.log("Task completed: max level reached");
      task.status = "completed";
      return null;
    }
      if (state.buildQueue.length >= 2) {
      console.log("Queue full. Skipping village.");
      return null;
    }

    if (!field.isBuildable) {
      console.log("Field not buildable right now");
      return null;
    }

    if (state.buildQueue.length >= 2) {
      console.log("Build queue not empty");
      return null;
    }

    return {
      action: "upgrade_field",
      slotId: field.slotId
    };
  }
}
