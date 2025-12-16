const fs = require("fs");
const path = require("path");

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, "userConfig.json");
    this.data = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, "utf8"));
      }
      return { users: {} };
    } catch (error) {
      console.error("Error loading config:", error);
      return { users: {} };
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2));
      return true;
    } catch (error) {
      console.error("Error saving config:", error);
      return false;
    }
  }

  getDefaultConfig() {
    return {
      OPTIONS: {
        location: "Bangkok",
        tz: "Asia/Bangkok",
      },
      RPC: {
        delay: 4000,
        timestamp: {
          start: "2025-01-01T00:00:00.000Z",
          end: "2029-12-31T23:59:59.000Z",
        },
        TwitchURL: "https://www.twitch.tv/example",
        YoutubeURL: "https://www.youtube.com/@example",
        details: ["Default Details - {time:en:12}"],
        state: ["Default State"],
        assetsLargeText: ["{ping} ms - {uptime:days}"],
        assetsSmallText: ["Default Small Text"],
        assetsLargeImage: ["https://i.pinimg.com/736x/2b/f3/54/2bf35424a5b4e1674321d24f49898e21.jpg"],
        assetsSmallImage: ["none"],
        buttonFirst: [
          {
            label: "Button 1",
            url: "https://discord.gg/TSdpyMMfrU",
          },
        ],
        buttonSecond: [
          {
            label: "Button 2",
            url: "https://github.com/4levy/Streaming-status",
          },
        ],
      },
      INPUTS: {
        activity: {
          type: "LISTENING",
        },
      },
      _isDefault: true,
    };
  }

  getUserConfig(userId) {
    if (!this.data.users[userId]) {
      const defaultConfig = this.getDefaultConfig();
      return defaultConfig;
    }

    const userConfig = this.data.users[userId];
    userConfig._isDefault = false;
    return userConfig;
  }

  setUserConfig(userId, config) {
    try {
      if (!this.data.users) {
        this.data.users = {};
      }

      const configToSave = { ...config };
      delete configToSave._isDefault;

      this.data.users[userId] = configToSave;
      return this.saveConfig();
    } catch (error) {
      console.error("Error setting user config:", error);
      return false;
    }
  }

  isDefaultConfig(userId) {
    return !this.data.users[userId];
  }
}

module.exports = new ConfigManager();
