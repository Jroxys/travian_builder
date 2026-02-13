import BotEngine from './engine/BotEngine.js';
import config from './config/defaultConfig.json' with { type: 'json' };

const engine = new BotEngine(config)
engine.start()