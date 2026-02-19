import BotEngine from './engine/BotEngine.js';
import MultiAccountManager from './engine/MultiAccountManager.js';
import config from './config/defaultConfig.json' with { type: 'json' };

const manager = new MultiAccountManager(config);
manager.startAll()