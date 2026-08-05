import os
from typing import Dict, Any

DEFAULT_PALWORLD_SETTINGS = {
    "Difficulty": "None",
    "ServerName": "Default PalWorld Server",
    "ServerDescription": "",
    "AdminPassword": "",
    "ServerPassword": "",
    "PublicPort": 8211,
    "PublicIP": "",
    "RCONEnabled": False,
    "RCONPort": 25575,
    "Region": "",
    "bUseAuth": True,
    "BanListURL": "https://api.palguard.me/api/banlist.txt",
    "ServerPlayerMaxNum": 32,
    "DayTimeSpeedRate": 1.0,
    "NightTimeSpeedRate": 1.0,
    "ExpRate": 1.0,
    "PalCaptureRate": 1.0,
    "PalSpawnNumRate": 1.0,
    "PalDamageRateAttack": 1.0,
    "PalDamageRateDefense": 1.0,
    "PlayerDamageRateAttack": 1.0,
    "PlayerDamageRateDefense": 1.0,
    "PlayerStomachDecreaceRate": 1.0,
    "PlayerStaminaDecreaceRate": 1.0,
    "PlayerAutoHPRegeneRate": 1.0,
    "PlayerAutoHpRegeneRateInSleep": 1.0,
    "PalStomachDecreaceRate": 1.0,
    "PalStaminaDecreaceRate": 1.0,
    "PalAutoHPRegeneRate": 1.0,
    "PalAutoHpRegeneRateInSleep": 1.0,
    "BuildObjectDamageRate": 1.0,
    "BuildObjectDeteriorationDamageRate": 1.0,
    "CollectionDropRate": 1.0,
    "CollectionObjectHpRate": 1.0,
    "CollectionObjectRespawnSpeedRate": 1.0,
    "EnemyDropItemRate": 1.0,
    "DeathPenalty": "All",
    "bEnablePlayerToPlayerDamage": False,
    "bEnableFriendlyFire": False,
    "bEnableInvaderEnemy": True,
    "bActiveUNKO": False,
    "bEnableAimAssistPad": False,
    "bEnableAimAssistKeyboard": False,
    "DropItemMaxNum": 3000,
    "DropItemMaxNum_UNKO": 100,
    "BaseCampMaxNum": 128,
    "BaseCampWorkerMaxNum": 15,
    "DropItemAliveMaxHours": 1.0,
    "bAutoResetGuildNoOnlinePlayers": False,
    "AutoResetGuildTimeNoOnlinePlayers": 72.0,
    "GuildPlayerMaxNum": 20,
    "PalEggDefaultHatchingTime": 72.0,
    "WorkSpeedRate": 1.0,
    "bIsMultiplay": False,
    "bIsPvP": False,
    "bCanPickupOtherGuildDeathPenaltyDrop": False,
    "bEnableNonLoginPenalty": True,
    "bEnableFastTravel": True,
    "bIsStartLocationSelectByMap": True,
    "bExistPlayerAfterLogout": False,
    "bEnableDefenseOtherGuildPlayer": False,
    "CoopPlayerMaxNum": 4,
    "bEnableXboxCrossplay": True,
}

SETTINGS_PRESETS = {
    "beginner": {
        "label": "Beginner",
        "description": "Extra forgiving - great for first-time players",
        "icon": "&#9730;",
        "settings": {
            "ExpRate": 3.0, "PalCaptureRate": 2.5, "PalSpawnNumRate": 1.2,
            "PalDamageRateAttack": 0.5, "PalDamageRateDefense": 1.5,
            "PlayerDamageRateAttack": 2.0, "PlayerDamageRateDefense": 0.5,
            "PalEggDefaultHatchingTime": 2.0,
            "DeathPenalty": "None", "bEnablePlayerToPlayerDamage": False,
            "bEnableFriendlyFire": False, "ServerPlayerMaxNum": 8,
            "DropItemMaxNum": 5000,
        }
    },
    "casual": {
        "label": "Casual",
        "description": "Relaxed gameplay - easier combat and faster progress",
        "icon": "&#9728;",
        "settings": {
            "ExpRate": 2.0, "PalCaptureRate": 2.0, "PalSpawnNumRate": 1.0,
            "PalDamageRateAttack": 0.8, "PalDamageRateDefense": 1.2,
            "PlayerDamageRateAttack": 1.3, "PlayerDamageRateDefense": 0.8,
            "PalEggDefaultHatchingTime": 36.0,
            "DeathPenalty": "None", "bEnablePlayerToPlayerDamage": False,
            "bEnableFriendlyFire": False, "ServerPlayerMaxNum": 8,
        }
    },
    "normal": {
        "label": "Normal",
        "description": "Standard PalWorld experience as intended",
        "icon": "&#9733;",
        "settings": {
            "ExpRate": 1.0, "PalCaptureRate": 1.0, "PalSpawnNumRate": 1.0,
            "PalDamageRateAttack": 1.0, "PalDamageRateDefense": 1.0,
            "PlayerDamageRateAttack": 1.0, "PlayerDamageRateDefense": 1.0,
            "PalEggDefaultHatchingTime": 72.0,
            "DeathPenalty": "All", "bEnablePlayerToPlayerDamage": False,
            "bEnableFriendlyFire": False, "ServerPlayerMaxNum": 32,
        }
    },
    "hard": {
        "label": "Hard",
        "description": "Increased difficulty - tougher enemies, scarce resources",
        "icon": "&#9760;",
        "settings": {
            "ExpRate": 0.5, "PalCaptureRate": 0.6, "PalSpawnNumRate": 0.8,
            "PalDamageRateAttack": 1.5, "PalDamageRateDefense": 0.7,
            "PlayerDamageRateAttack": 0.7, "PlayerDamageRateDefense": 1.4,
            "PalEggDefaultHatchingTime": 144.0,
            "DeathPenalty": "All", "bEnablePlayerToPlayerDamage": True,
            "bEnableFriendlyFire": True, "ServerPlayerMaxNum": 16,
            "DropItemMaxNum": 1000, "BuildObjectDeteriorationDamageRate": 2.0,
        }
    },
    "creative": {
        "label": "Creative",
        "description": "Unlimited resources, instant progress, no restrictions",
        "icon": "&#9997;",
        "settings": {
            "ExpRate": 5.0, "PalCaptureRate": 3.0, "PalSpawnNumRate": 2.0,
            "PalDamageRateAttack": 0.3, "PalDamageRateDefense": 2.0,
            "PlayerDamageRateAttack": 3.0, "PlayerDamageRateDefense": 0.3,
            "PalEggDefaultHatchingTime": 0.0,
            "DeathPenalty": "None", "bEnablePlayerToPlayerDamage": False,
            "bEnableFriendlyFire": False, "ServerPlayerMaxNum": 8,
            "WorkSpeedRate": 5.0, "BaseCampWorkerMaxNum": 30,
            "GuildPlayerMaxNum": 50, "DropItemMaxNum": 10000,
            "bEnableFastTravel": True,
        }
    },
    "speedrun": {
        "label": "Speed Run",
        "description": "Fast XP, instant eggs, max spawns - race to endgame",
        "icon": "&#9889;",
        "settings": {
            "ExpRate": 4.0, "PalCaptureRate": 2.0, "PalSpawnNumRate": 2.5,
            "PalDamageRateAttack": 0.7, "PalDamageRateDefense": 1.3,
            "PlayerDamageRateAttack": 1.5, "PlayerDamageRateDefense": 0.7,
            "PalEggDefaultHatchingTime": 0.0,
            "DeathPenalty": "Item", "bEnablePlayerToPlayerDamage": False,
            "bEnableFriendlyFire": False, "ServerPlayerMaxNum": 8,
            "WorkSpeedRate": 3.0, "DayTimeSpeedRate": 1.5, "NightTimeSpeedRate": 3.0,
            "bEnableFastTravel": True,
        }
    },
}


def read_config(filepath: str) -> Dict[str, Any]:
    if not os.path.exists(filepath):
        return dict(DEFAULT_PALWORLD_SETTINGS)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    settings = {}
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith(";") or line.startswith("#") or line.startswith("["):
            continue
        if "OptionSettings=(" in line:
            start = line.index("OptionSettings=(") + len("OptionSettings=(")
            params = line[start:].rstrip(")")
            for part in _split_csv(params):
                if "=" in part:
                    key, _, value = part.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"')
                    settings[key] = _parse_value(value)
        elif "=" in line:
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"')
            settings[key] = _parse_value(value)
    return settings


def _split_csv(text: str) -> list:
    parts = []
    current = []
    in_quotes = False
    for ch in text:
        if ch == '"':
            in_quotes = not in_quotes
            current.append(ch)
        elif ch == ',' and not in_quotes:
            parts.append(''.join(current))
            current = []
        else:
            current.append(ch)
    if current:
        parts.append(''.join(current))
    return [p for p in parts if p.strip()]


def write_config(filepath: str, settings: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    lines = ["[/Script/Pal.PalGameWorldSettings]"]
    values = []
    for key, val in settings.items():
        if isinstance(val, bool):
            values.append(f"{key}={str(val)}")
        elif isinstance(val, str):
            values.append(f'{key}="{val}"')
        else:
            values.append(f"{key}={val}")
    lines.append("OptionSettings=(" + ",".join(values) + ")")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _parse_value(value: str) -> Any:
    if value.isdigit():
        return int(value)
    try:
        return float(value)
    except ValueError:
        pass
    if value.lower() in ("true", "false"):
        return value.lower() == "true"
    return value


def get_default_settings() -> Dict[str, Any]:
    return dict(DEFAULT_PALWORLD_SETTINGS)


def get_presets() -> Dict[str, Any]:
    return SETTINGS_PRESETS
