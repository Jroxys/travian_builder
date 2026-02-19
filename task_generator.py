import json
from copy import deepcopy

# ================================
# CONFIGURE THESE
# ================================

VILLAGES = {
    "account_1": "31309",
    "account_2": "31315"
}

# Field slot IDs (dorf1)
FIELD_SLOTS = list(range(1, 19))  # change if needed

# Building slots (dorf2)
WAREHOUSE_SLOT = 30
GRANARY_SLOT = 32
MAIN_BUILDING_SLOT = 26
BARRACKS_SLOT = 29

# GID values (change if needed)
WAREHOUSE_GID = 10
GRANARY_GID = 11
BARRACKS_GID = 19


# ================================
# GENERATOR LOGIC
# ================================

def generate_tasks(village_id):
    tasks = []
    priority = 1
    task_id = 1

    def next_id():
        nonlocal task_id
        tid = f"task-{task_id:05d}"
        task_id += 1
        return tid

    def add_field_tasks(max_level):
        nonlocal priority
        for slot in FIELD_SLOTS:
            tasks.append({
                "id": next_id(),
                "villageId": village_id,
                "type": "upgrade_field",
                "target": {"slotId": slot},
                "condition": {"maxLevel": max_level},
                "priority": priority,
                "status": "active"
            })
            priority += 1

    def add_upgrade(slot, max_level):
        nonlocal priority
        tasks.append({
            "id": next_id(),
            "villageId": village_id,
            "type": "upgrade_building",
            "target": {"slotId": slot},
            "condition": {"maxLevel": max_level},
            "priority": priority,
            "status": "active"
        })
        priority += 1

    def add_new_building(slot, gid):
        nonlocal priority
        tasks.append({
            "id": next_id(),
            "villageId": village_id,
            "type": "new_building",
            "target": {"slotId": slot, "gid": gid},
            "condition": {},
            "priority": priority,
            "status": "active"
        })
        priority += 1

    def add_hero_task():
        nonlocal priority
        tasks.append({
            "id": next_id(),
            "villageId": village_id,
            "type": "send_hero_adventure",
            "condition": {"minHealth": 40},
            "priority": priority,
            "status": "active"
        })
        priority += 1

    # ====================================
    # TASK FLOW (SENİN VERDİĞİN PLANA GÖRE)
    # ====================================

    add_hero_task()

    # Fields → 2
    add_field_tasks(2)

    # Build storage
    add_new_building(WAREHOUSE_SLOT, WAREHOUSE_GID)
    add_new_building(GRANARY_SLOT, GRANARY_GID)

    # Storage → 2
    add_upgrade(WAREHOUSE_SLOT, 2)
    add_upgrade(GRANARY_SLOT, 2)

    # Fields → 3
    add_field_tasks(3)
    add_upgrade(WAREHOUSE_SLOT, 3)
    add_upgrade(GRANARY_SLOT, 3)

    # Fields → 4
    add_field_tasks(4)
    add_upgrade(WAREHOUSE_SLOT, 5)
    add_upgrade(GRANARY_SLOT, 5)

    # Main building → 5
    add_upgrade(MAIN_BUILDING_SLOT, 5)

    # Fields → 5
    add_field_tasks(5)
    add_upgrade(WAREHOUSE_SLOT, 6)
    add_upgrade(GRANARY_SLOT, 6)

    # Build barracks
    add_new_building(BARRACKS_SLOT, BARRACKS_GID)

    # Fields → 6
    add_field_tasks(6)
    add_upgrade(WAREHOUSE_SLOT, 8)
    add_upgrade(GRANARY_SLOT, 8)

    # Barracks → 5
    add_upgrade(BARRACKS_SLOT, 5)

    # Fields → 7
    add_field_tasks(7)
    add_upgrade(WAREHOUSE_SLOT, 10)
    add_upgrade(GRANARY_SLOT, 10)

    # Fields → 8
    add_field_tasks(8)

    return tasks


# ================================
# EXPORT FILES
# ================================

for account_name, village_id in VILLAGES.items():
    tasks = generate_tasks(village_id)

    with open(f"{account_name}_tasks.json", "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2, ensure_ascii=False)

print("Task files generated successfully.")
