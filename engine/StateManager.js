import config from '../config/defaultConfig.json' with { type: 'json' };
import { BUILDING_MAP } from "../constants/buildingMap.js";

export default class StateManager {
    async getHeroAttiributes(worker) {
      const page = worker.page;
      let heroState = {health: 0, experience: 0 , isRunning: null};
      await page.waitForLoadState("networkidle");
      const statsTable = await page.locator(".stats");
      const health = await statsTable.locator(".value").nth(0).innerText();
      const experience = await statsTable.locator(".value").nth(1).innerText();
       const runningIcon = page.locator("i.heroRunning");
      let  isRunning =  false;
          if (await runningIcon.count() > 0) {
               isRunning = true;
            }
      heroState.health = health;
      heroState.experience = experience;
      heroState.isRunning = isRunning;

      return heroState;
    }
    async getHeroAdventures(worker) {
      const page = worker.page;
      await page.waitForLoadState("networkidle")
      const adventureTable = await page.locator("table.adventureList");
     
          const adventureTBody = await adventureTable.locator("tbody");
          const adventureRows = await adventureTBody.locator("tr").all();   
          let adventures = [];
             for (const row of adventureRows) {
              const noAdventureClass = await row.locator("td").all();
                 if (noAdventureClass.length === 1) {
            console.log("No adventures found for hero.");
            return null;
          }
            const distance = await row.locator("td.distance").innerText();
            const duration = await row.locator("td.duration .duration").innerText();
            adventures.push({
              distance,
              duration
            })
           }
           return adventures;
          
    }
      


    // data gid yine her binanın aynı 0 empty slot 
    // data aid slot 
    // good classı var aynı şekil
    // level bilgisi al
    // href link şöyle çalışıyor /build.php?id=26&amp;gid=15
  async getBuildings(worker) {
    const page = worker.page;
    let buildings = [];

    const buildingElements = await page.locator(".buildingSlot").all();

    for (const buildingElement of buildingElements) {

      const gidAttr = await buildingElement.getAttribute("data-gid");
      const slotAttr = await buildingElement.getAttribute("data-aid");
      

      const slotId = parseInt(slotAttr, 10);

     
      if (!gidAttr || gidAttr === "0") {
        buildings.push({
          slotId,
          gid: 0,
          empty: true
        });
        continue;
      }

      const gidNumber = parseInt(gidAttr, 10);

      const aElement = buildingElement.locator("a");
      const aClass = await aElement.getAttribute("class");


      const isBuildable =
        aClass &&
        !aClass.includes("notNow") &&
        !aClass.includes("maxLevel");
        const isUnderConstruction = aClass.includes("underConstruction");

      const level = parseInt(
        await aElement.getAttribute("data-level"),
        10
      ) || 0;

      buildings.push({
        slotId,
        gid: gidNumber,
        name: BUILDING_MAP[gidNumber] || "Unknown",
         level,
        isBuildable,
        isUnderConstruction
      });
    }

  return buildings;
}


  // gid 1 wood gid 2 clay gid 3 iron gid 4 crop 
  // notnow classı var eğer notnowsa build olmuyor
  // good classı var eğer goodsa build olabiliyor
  // level classı var ordan level bilgisi alınabilir
  // href linki var burdan direkt build sayfasına gidilebilir


  async getFields(worker){
    const page = worker.page;
    let fields = [];
    const fieldElements = await page.locator("a.resourceField").all();
    for (const fieldElement of fieldElements) {
      let fieldType = await fieldElement.getAttribute("data-gid");
      const fieldPlace = await fieldElement.getAttribute("data-aid");
      const className = await fieldElement.getAttribute("class");
      const isBuildable = className.includes("good");
      const isUnderConstruction = className.includes("underConstruction");

      const labelLocator = fieldElement.locator(".labelLayer");
      let level = 0;
     if (await labelLocator.count() > 0) {
    const levelText = await labelLocator.innerText();
    // Metni temizle ve sayıya çevir, eğer sayı yoksa 0 yap
    level = parseInt(levelText.replace(/[^0-9]/g, ""), 10) || 0;
    console.log("Level: ",level)
}
      switch (fieldType) {
        case "1":
          fieldType = "wood";
          break;
        case "2":
          fieldType = "clay";
          break;  
        case "3":
          fieldType = "iron";
          break;
        case "4":
          fieldType = "crop";
          break;
      }
      fields.push({
        type: fieldType,
        slotId: parseInt(fieldPlace, 10),
        isBuildable,
        level,
        isUnderConstruction
      });
      
    }
    return fields;
  }


  async getActiveVillage(worker) {
    const page = worker.page;
    const activeVillageElement = await page.locator(".listEntry.village.active").getAttribute("data-did");
    const activeVillageName = await page.locator(".listEntry.village.active").innerText();
    console.log("Active village:", activeVillageElement , activeVillageName);
    return {
      activeVillage: activeVillageElement,
      activeVillageName: activeVillageName
    };
    
  }

  async  getVillageList(worker) {
    const page = worker.page;
    let villages = [];
    const villageElements = await page.locator(".listEntry.village").all();
    for (const villageElement of villageElements) {
      const newDid = await villageElement.getAttribute("data-did")
      const villageName = await villageElement.locator(".name").innerText();
      const villageCoords = await villageElement.locator(".coordinates").innerText();
        villages.push({
          name: villageName,
          coordinates: villageCoords,
          newDid: newDid
        })
    }
      return villages;
          
    
}
  // buraya slotId ve name gelcek
  // burda bir şey ile slotid eşleşmesi lazım ki hangi building olduğunu anlayabilelim
  // gid bilgisi de gelcek o gid bilgisi ile hangi binanın olduğunu anlayabiliriz
  // gid 1 ahşap gid 2 kerpiç gid 3 demir gid 4 tahıl gibi
  async getBuildQueue(worker) {
    const page = worker.page;
    let buildQueue = [];
      
      const buildList = await page.locator(".buildingList").locator("li").all();
      for (const build of buildList) {
        const buildText = await build.locator(".name").innerText();
        const buildLevel = await build.locator(".lvl").innerText();
        const buildTime = await build.locator(".timer").innerText();
        buildQueue.push({
          name: buildText,
          level: buildLevel,
          timeRemaining: buildTime
        })
       }
      return buildQueue;

  }

  async getEconomy(worker) {
    const page = worker.page;
    
  
  let warehouseCapacity;
  let granaryCapacity;
  let productionList = [];
  const productionBar = await page.locator("#production")
  const productionTBody = await productionBar.locator("tbody")
  const productionRows = await productionTBody.locator("tr").all()
  for (const row of productionRows) {
    const productionValues = await row.locator(".num").innerText();
    const cleaned = productionValues.replace(/[^0-9\-]/g, "");
    const number = parseInt(cleaned, 10);
    productionList.push(number);
  }
   const stockBar = await page.locator("#stockBar")
   const values = await stockBar.locator(".value").all()
   const capacity = await stockBar.locator(".capacity").all()
   for (const cap of capacity) {
      const icon = await cap.locator("i")
      const className = await icon.getAttribute("class")
      const valueNumber = await  cap.locator(".value").innerText()
      const cleanValue = valueNumber.replace(/[^0-9]/g, "")
      const number = parseInt(cleanValue,10)
      if (className.includes("warehouse")) {
        warehouseCapacity = number;
      }
      if (className.includes("granary")) {
       granaryCapacity = number;
      }
   }

   let resources = {
  wood:  { current: 0, capacity: 0 , productionValue: 0},
  clay:  { current: 0, capacity: 0 , productionValue: 0},
  iron:  { current: 0, capacity: 0 , productionValue: 0},
  crop:  { current: 0, capacity: 0 , productionValue: 0}
};

  for (const res of values) {
  const id = await res.getAttribute("id");
  const text = await res.innerText();
  const cleaned = text.replace(/[^0-9]/g, "");
  const number = parseInt(cleaned, 10);
switch (id) {
  case "l1":
    resources.wood.current = number;
    resources.wood.capacity = warehouseCapacity;
    resources.wood.productionValue = productionList[0];
    break;

  case "l2":
    resources.clay.current = number;
    resources.clay.capacity = warehouseCapacity;
    resources.clay.productionValue = productionList[1];
    break;

  case "l3":
    resources.iron.current = number;
    resources.iron.capacity = warehouseCapacity;
    resources.iron.productionValue = productionList[2];
    break;

  case "l4":
    resources.crop.current = number;
    resources.crop.capacity = granaryCapacity;
    resources.crop.productionValue = productionList[3];
    break;
}

  }
  return resources;
  }
}
