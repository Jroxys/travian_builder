import fs from "fs";
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

 getTasksForVillage(villageId) {
  return this.tasks.filter(
    t =>
      t.status === "active" &&
      String(t.villageId) === String(villageId)
  ) .sort((a, b) => a.priority - b.priority);
  }

  evaluate(task, state) {

    if (task.type === "upgrade_field") {
      return this.evaluateUpgradeField(task, state);
    }
    if (task.type === "upgrade_building") {
        return this.evaluateUpgradeBuilding(task, state);
        }

    return null;
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

    if (!field.isBuildable) {
      console.log("Field not buildable right now");
      return null;
    }

    if (state.buildQueue.length > 1) {
      console.log("Build queue not empty");
      return null;
    }

    return {
      action: "upgrade_field",
      slotId: field.slotId
    };
  }
}
