import config from '../config/defaultConfig.json' with { type: 'json' };

export default class StateManager {
  //active village name ? 
  //newdidleri al ve o didlerle  ts30.x3.international.travian.com/dorf1.php?newdid=33123 gibi url'lere giderek her köyün durumunu al
  // newdidlerle köye gidiyor doğru köyü böyle seçiyor.
/* 
  async refresh(worker) {

      const economy = await this.getEconomy(worker);
      const villageList = await this.getVillageList(worker);
      const buildQueue = await this.getBuildQueue(worker);
      const fields = await this.getFields(worker);
      const hero = await this.getHeroState(worker);
      

    return {
      villageList,
      economy,
      buildQueue,
      fields,
      hero,
      timestamp: Date.now()
    };
  } */

    // data gid yine her binanın aynı 0 empty slot 
    // data aid slot 
    // good classı var aynı şekil
    // level bilgisi al
    // href link şöyle çalışıyor /build.php?id=26&amp;gid=15
    async getCenter(worker) {
      const page = worker.page;
      let center = []
      const centerElements = await page.locator(".buildingSlot").all();
      for (const centerElement of centerElements) {
        const fieldType = await centerElement.getAttribute("data-gid");
        const centerPlace = await centerElement.getAttribute("data-aid");
        const className = await centerElement.getAttribute("class");
        const isBuildable = className.includes("good") && className.includes("emptyBuildingSlot");
        //const levelText = await centerElement.locator(".labelLayer").innerText();
        //const level = parseInt(levelText.replace(/[^0-9]/g, ""), 10);
        center.push({
          type: fieldType,
          place: centerPlace,
          isBuildable,
          //level
        });
    }
    return center;
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
      const levelText = await fieldElement.locator(".labelLayer").innerText();
      const level = parseInt(levelText.replace(/[^0-9]/g, ""), 10);
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
        place: fieldPlace,
        isBuildable,
        level
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

  async getHeroState(worker) {
    const page = worker.page;
    let heroState = {health: 0, experience: 0};
    await page.goto(config.serverUrl+"/hero/attributes");
    const heroHealth = await page.locator(".stats").locator(".value").nth(0).innerText();
    const heroExperience = await page.locator(".stats").locator(".value").nth(1).innerText();
    heroState.health = heroHealth;
    heroState.experience = heroExperience;
  return heroState;
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
