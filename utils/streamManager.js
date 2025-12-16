const { Client, RichPresence } = require("discord.js-selfbot-v13");
const moment = require("moment-timezone");
const { schedule } = require("node-cron");
const os = require("os");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("colors");

class GetImage {
  constructor(client) {
    this.client = client;
  }

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async get(url1, url2) {
    try {
      const { getExternal } = RichPresence;

      const urls = [url1, url2].map(url => (this.isValidURL(url) ? url : null));
      const validUrls = urls.filter(Boolean);

      if (validUrls.length === 0) {
        return { bigImage: null, smallImage: null };
      }

      const images = await getExternal(this.client, "1438613688406769778", ...validUrls);
      let finalUrl1 = null;
      let finalUrl2 = null;

      for (const img of images) {
        const { url, external_asset_path } = img;
        const finalPath = url.includes("attachments") ? url : external_asset_path;

        if (url === url1) finalUrl1 = finalPath;
        if (url === url2) finalUrl2 = finalPath;
      }

      return {
        bigImage: finalUrl1,
        smallImage: finalUrl2,
      };
    } catch (error) {
      console.error("[GetExternalImage Error]:", error);
      return { bigImage: null, smallImage: null };
    }
  }
}

class Weather {
  constructor(location) {
    this.location = location;
    this.feelslike_c = 0;
    this.feelslike_f = 0;
    this.windchill_c = 0;
    this.windchill_f = 0;
    this.heatindex_c = 0;
    this.heatindex_f = 0;
    this.dewpoint_c = 0;
    this.dewpoint_f = 0;
    this.co = 0;
    this.no2 = 0;
    this.o3 = 0;
    this.so2 = 0;
    this.pm10 = 0;
    this.stop = 0;
    schedule("*/5 * * * *", () => this.update());
  }

  async update() {
    try {
      const params = new URLSearchParams();
      params.append("key", "1e1a0f498dbf472cb3991045241608");
      params.append("q", encodeURIComponent(this.location));
      params.append("aqi", "yes");
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?${params}`
      );
      const data = await response.json();
      this.timezone = data.location.tz_id;
      this.city = data.location.name;
      this.region = data.location.region;
      this.country = data.location.country;
      this.temp_c = data.current.temp_c;
      this.temp_f = data.current.temp_f;
      this.wind_kph = data.current.wind_kph;
      this.wind_mph = data.current.wind_mph;
      this.wind_degree = data.current.wind_degree;
      this.pressure_mb = data.current.pressure_mb;
      this.pressure_in = data.current.pressure_in;
      this.precip_mm = data.current.precip_mm;
      this.precip_in = data.current.precip_in;
      this.wind_dir = data.current.wind_dir;
      this.gust_kph = data.current.gust_kph;
      this.gust_mph = data.current.gust_mph;
      this.vis_km = data.current.vis_km;
      this.vis_mi = data.current.vis_miles;
      this.humidity = data.current.humidity;
      this.cloud = data.current.cloud;
      this.uv = data.current.uv;
      this.pm2_5 = data.current.air_quality.pm2_5;
      this.feelslike_c = data.current.feelslike_c;
      this.feelslike_f = data.current.feelslike_f;
      this.windchill_c = data.current.windchill_c;
      this.windchill_f = data.current.windchill_f;
      this.heatindex_c = data.current.heatindex_c;
      this.heatindex_f = data.current.heatindex_f;
      this.dewpoint_c = data.current.dewpoint_c;
      this.dewpoint_f = data.current.dewpoint_f;
      this.co = data.current.air_quality.co;
      this.no2 = data.current.air_quality.no2;
      this.o3 = data.current.air_quality.o3;
      this.so2 = data.current.air_quality.so2;
      this.pm10 = data.current.air_quality.pm10;
    } catch {
      if (this.stop > 10) {
        return;
      }
      this.stop++;
      this.update();
    }
  }
}

class SystemInfo {
  constructor() {
    this.cpuname = os.cpus()[0]?.model;
    this.cpucores = os.cpus()?.length;
    this.cpuspeed = (os.cpus()[0]?.speed / 1000 || 0).toFixed(1);
    this.cpu = 0;
    this.ram = 0;
  }

  getCpuUsage() {
    let totalIdle = 0,
      totalTick = 0;
    const cpus = os.cpus();
    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    return 100 - Math.floor((totalIdle / totalTick) * 100);
  }

  async getCpuUsageOverInterval(interval) {
    return new Promise((resolve) => {
      const startMeasure = this._measureCpuTimes();
      setTimeout(() => {
        const endMeasure = this._measureCpuTimes();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        resolve(100 - Math.floor((idleDifference / totalDifference) * 100));
      }, interval);
    });
  }

  _measureCpuTimes() {
    let totalIdle = 0,
      totalTick = 0;
    const cpus = os.cpus();
    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    return { idle: totalIdle, total: totalTick };
  }

  getRamUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return Math.floor(((totalMem - freeMem) / totalMem) * 100);
  }

  async update() {
    this.cpu = await this.getCpuUsageOverInterval(1000);
    this.ram = this.getRamUsage();
  }
}

class Emoji {
  random() {
    const emojis = [
      "😄",
      "😃",
      "😀",
      "😊",
      "☺",
      "😉",
      "😍",
      "😘",
      "😚",
      "😗",
      "😙",
      "😜",
      "😝",
      "😛",
      "😳",
      "😁",
      "😔",
      "😌",
      "😒",
      "😞",
      "😣",
      "😢",
      "😂",
      "😭",
      "😪",
      "😥",
      "😰",
      "😅",
      "😓",
      "😩",
      "😫",
      "😨",
      "😱",
      "😠",
      "😡",
      "😤",
      "😖",
      "😆",
      "😋",
      "😷",
      "😎",
      "😴",
      "😵",
      "😲",
      "😟",
      "😦",
      "😧",
      "😈",
      "👿",
      "😮",
      "😬",
      "😐",
      "😕",
      "😯",
      "😶",
      "😇",
      "😏",
      "😑",
      "👲",
      "👳",
      "👮",
      "👷",
      "💂",
      "👶",
      "👦",
      "👧",
      "👨",
      "👩",
      "👴",
      "👵",
      "👱",
      "👼",
      "👸",
      "😺",
      "😸",
      "😻",
      "😽",
      "😼",
      "🙀",
      "😿",
      "😹",
      "😾",
      "👹",
      "👺",
      "🙈",
      "🙉",
      "🙊",
      "💀",
      "👽",
      "💩",
      "🔥",
      "✨",
      "🌟",
      "💫",
      "💥",
      "💢",
      "💦",
      "💧",
      "💤",
      "💨",
      "👂",
      "👀",
      "👃",
      "👅",
      "👄",
      "👍",
      "👎",
      "👌",
      "👊",
      "✊",
      "✌",
      "👋",
      "✋",
      "👐",
      "👆",
      "👇",
      "👉",
      "👈",
      "🙌",
      "🙏",
      "☝",
      "👏",
      "💪",
      "🚶",
      "🏃",
      "💃",
      "👫",
      "👪",
      "👬",
      "👭",
      "💏",
      "💑",
      "👯",
      "🙆",
      "🙅",
      "💁",
      "🙋",
      "💆",
      "💇",
      "💅",
      "👰",
      "🙎",
      "🙍",
      "🙇",
      "🎩",
      "👑",
      "👒",
      "👟",
      "👞",
      "👡",
      "👠",
      "👢",
      "👕",
      "👔",
      "👚",
      "👗",
      "🎽",
      "👖",
      "👘",
      "👙",
      "💼",
      "👜",
      "👝",
      "👛",
      "👓",
      "🎀",
      "🌂",
      "💄",
      "💛",
      "💙",
      "💜",
      "💚",
      "❤",
      "💔",
      "💗",
      "💓",
      "💕",
      "💖",
      "💞",
      "💘",
      "💌",
      "💋",
      "💍",
      "💎",
      "👤",
      "👥",
      "💬",
      "👣",
      "💭",
      "🐶",
      "🐺",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🐸",
      "🐯",
      "🐨",
      "🐻",
      "🐷",
      "🐽",
      "🐮",
      "🐗",
      "🐵",
      "🐒",
      "🐴",
      "🐑",
      "🐘",
      "🐼",
      "🐧",
      "🐦",
      "🐤",
      "🐥",
      "🐣",
      "🐔",
      "🐍",
      "🐢",
      "🐛",
      "🐝",
      "🐜",
      "🐞",
      "🐌",
      "🐙",
      "🐚",
      "🐠",
      "🐟",
      "🐬",
      "🐳",
      "🐋",
      "🐄",
      "🐏",
      "🐀",
      "🐃",
      "🐅",
      "🐇",
      "🐉",
      "🐎",
      "🐐",
      "🐓",
      "🐕",
      "🐖",
      "🐁",
      "🐂",
      "🐲",
      "🐡",
      "🐊",
      "🐫",
      "🐪",
      "🐆",
      "🐈",
      "🐩",
      "🐾",
      "💐",
      "🌸",
      "🌷",
      "🍀",
      "🌹",
      "🌻",
      "🌺",
      "🍁",
      "🍃",
      "🍂",
      "🌿",
      "🌾",
      "🍄",
      "🌵",
      "🌴",
      "🌲",
      "🌳",
      "🌰",
      "🌱",
      "🌼",
      "🌐",
      "🌞",
      "🌝",
      "🌚",
      "🌑",
      "🌒",
      "🌓",
      "🌔",
      "🌕",
      "🌖",
      "🌗",
      "🌘",
      "🌜",
      "🌛",
      "🌙",
      "🌍",
      "🌎",
      "🌏",
      "🌋",
      "🌌",
      "🌠",
      "⭐",
      "☀",
      "⛅",
      "☁",
      "⚡",
      "☔",
      "❄",
      "⛄",
      "🌀",
      "🌁",
      "🌈",
      "🌊",
      "🎍",
      "💝",
      "🎎",
      "🎒",
      "🎓",
      "🎏",
      "🎆",
      "🎇",
      "🎐",
      "🎑",
      "🎃",
      "👻",
      "🎅",
      "🎄",
      "🎁",
      "🎋",
      "🎉",
      "🎊",
      "🎈",
      "🎌",
      "🔮",
      "🎥",
      "📷",
      "📹",
      "📼",
      "💿",
      "📀",
      "💽",
      "💾",
      "💻",
      "📱",
      "☎",
      "📞",
      "📟",
      "📠",
      "📡",
      "📺",
      "📻",
      "🔊",
      "🔉",
      "🔈",
      "🔇",
      "🔔",
      "🔕",
      "📢",
      "📣",
      "⏳",
      "⌛",
      "⏰",
      "⌚",
      "🔓",
      "🔒",
      "🔏",
      "🔐",
      "🔑",
      "🔎",
      "💡",
      "🔦",
      "🔆",
      "🔅",
      "🔌",
      "🔋",
      "🔍",
      "🛁",
      "🛀",
      "🚿",
      "🚽",
      "🔧",
      "🔩",
      "🔨",
      "🚪",
      "🚬",
      "💣",
      "🔫",
      "🔪",
      "💊",
      "💉",
      "💰",
      "💴",
      "💵",
      "💷",
      "💶",
      "💳",
      "💸",
      "📲",
      "📧",
      "📥",
      "📤",
      "✉",
      "📩",
      "📨",
      "📯",
      "📫",
      "📪",
      "📬",
      "📭",
      "📮",
      "📦",
      "📝",
      "📄",
      "📃",
      "📑",
      "📊",
      "📈",
      "📉",
      "📜",
      "📋",
      "📅",
      "📆",
      "📇",
      "📁",
      "📂",
      "✂",
      "📌",
      "📎",
      "✒",
      "✏",
      "📏",
      "📐",
      "📕",
      "📗",
      "📘",
      "📙",
      "📓",
      "📔",
      "📒",
      "📚",
      "📖",
      "🔖",
      "📛",
      "🔬",
      "🔭",
      "📰",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎵",
      "🎶",
      "🎹",
      "🎻",
      "🎺",
      "🎷",
      "🎸",
      "👾",
      "🎮",
      "🃏",
      "🎴",
      "🀄",
      "🎲",
      "🎯",
      "🏈",
      "🏀",
      "⚽",
      "⚾",
      "🎾",
      "🎱",
      "🏉",
      "🎳",
      "⛳",
      "🚵",
      "🚴",
      "🏁",
      "🏇",
      "🏆",
      "🎿",
      "🏂",
      "🏊",
      "🏄",
      "🎣",
      "☕",
      "🍵",
      "🍶",
      "🍼",
      "🍺",
      "🍻",
      "🍸",
      "🍹",
      "🍷",
      "🍴",
      "🍕",
      "🍔",
      "🍟",
      "🍗",
      "🍖",
      "🍝",
      "🍛",
      "🍤",
      "🍱",
      "🍣",
      "🍥",
      "🍙",
      "🍘",
      "🍚",
      "🍜",
      "🍲",
      "🍢",
      "🍡",
      "🍳",
      "🍞",
      "🍩",
      "🍮",
      "🍦",
      "🍨",
      "🍧",
      "🎂",
      "🍰",
      "🍪",
      "🍫",
      "🍬",
      "🍭",
      "🍯",
      "🍎",
      "🍏",
      "🍊",
      "🍋",
      "🍒",
      "🍇",
      "🍉",
      "🍓",
      "🍑",
      "🍈",
      "🍌",
      "🍐",
      "🍍",
      "🍠",
      "🍆",
      "🍅",
      "🌽",
      "🏠",
      "🏡",
      "🏫",
      "🏢",
      "🏣",
      "🏥",
      "🏦",
      "🏪",
      "🏩",
      "🏨",
      "💒",
      "⛪",
      "🏬",
      "🏤",
      "🌇",
      "🌆",
      "🏯",
      "🏰",
      "⛺",
      "🏭",
      "🗼",
      "🗾",
      "🗻",
      "🌄",
      "🌅",
      "🌃",
      "🗽",
      "🌉",
      "🎠",
      "🎡",
      "⛲",
      "🎢",
      "🚢",
      "⛵",
      "🚤",
      "🚣",
      "⚓",
      "🚀",
      "✈",
      "💺",
      "🚁",
      "🚂",
      "🚊",
      "🚉",
      "🚞",
      "🚆",
      "🚄",
      "🚅",
      "🚈",
      "🚇",
      "🚝",
      "🚋",
      "🚃",
      "🚎",
      "🚌",
      "🚍",
      "🚙",
      "🚘",
      "🚗",
      "🚕",
      "🚖",
      "🚛",
      "🚚",
      "🚨",
      "🚓",
      "🚔",
      "🚒",
      "🚑",
      "🚐",
      "🚲",
      "🚡",
      "🚟",
      "🚠",
      "🚜",
      "💈",
      "🚏",
      "🎫",
      "🚦",
      "🚥",
      "⚠",
      "🚧",
      "🔰",
      "⛽",
      "🏮",
      "🎰",
      "♨",
      "🗿",
      "🎪",
      "🎭",
      "📍",
      "🚩",
      "⬆",
      "⬇",
      "⬅",
      "➡",
      "🔠",
      "🔡",
      "🔤",
      "↗",
      "↖",
      "↘",
      "↙",
      "↔",
      "↕",
      "🔄",
      "◀",
      "▶",
      "🔼",
      "🔽",
      "↩",
      "↪",
      "ℹ",
      "⏪",
      "⏩",
      "⏫",
      "⏬",
      "⤵",
      "⤴",
      "🆗",
      "🔀",
      "🔁",
      "🔂",
      "🆕",
      "🆙",
      "🆒",
      "🆓",
      "🆖",
      "📶",
      "🎦",
      "🈁",
      "🈯",
      "🈳",
      "🈵",
      "🈴",
      "🈲",
      "🉐",
      "🈹",
      "🈺",
      "🈶",
      "🈚",
      "🚻",
      "🚹",
      "🚺",
      "🚼",
      "🚾",
      "🚰",
      "🚮",
      "🅿",
      "♿",
      "🚭",
      "🈷",
      "🈸",
      "🈂",
      "Ⓜ",
      "🛂",
      "🛄",
      "🛅",
      "🛃",
      "🉑",
      "㊙",
      "㊗",
      "🆑",
      "🆘",
      "🆔",
      "🚫",
      "🔞",
      "📵",
      "🚯",
      "🚱",
      "🚳",
      "🚷",
      "🚸",
      "⛔",
      "✳",
      "❇",
      "❎",
      "✅",
      "✴",
      "💟",
      "🆚",
      "📳",
      "📴",
      "🅰",
      "🅱",
      "🆎",
      "🅾",
      "💠",
      "➿",
      "♻",
      "♈",
      "♉",
      "♊",
      "♋",
      "♌",
      "♍",
      "♎",
      "♏",
      "♐",
      "♑",
      "♒",
      "♓",
      "⛎",
      "🔯",
      "🏧",
      "💹",
      "💲",
      "💱",
      "©",
      "®",
      "™",
      "〽",
      "〰",
      "🔝",
      "🔚",
      "🔙",
      "🔛",
      "🔜",
      "❌",
      "⭕",
      "❗",
      "❓",
      "❕",
      "❔",
      "🔃",
      "🕛",
      "🕧",
      "🕐",
      "🕜",
      "🕑",
      "🕝",
      "🕒",
      "🕞",
      "🕓",
      "🕟",
      "🕔",
      "🕠",
      "🕕",
      "🕖",
      "🕗",
      "🕘",
      "🕙",
      "🕚",
      "🕡",
      "🕢",
      "🕣",
      "🕤",
      "🕥",
      "🕦",
      "✖",
      "➕",
      "➖",
      "➗",
      "♠",
      "♥",
      "♣",
      "♦",
      "💮",
      "💯",
      "✔",
      "☑",
      "🔘",
      "🔗",
      "➰",
      "🔱",
      "🔲",
      "🔳",
      "◼",
      "◻",
      "◾",
      "◽",
      "▪",
      "▫",
      "🔺",
      "⬜",
      "⬛",
      "⚫",
      "⚪",
      "🔴",
      "🔵",
      "🔻",
      "🔶",
      "🔷",
      "🔸",
      "🔹",
    ];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  getTime(hour) {
    const parsedHour = parseInt(hour, 10);
    return isNaN(parsedHour)
      ? "Invalid hour"
      : parsedHour >= 6 && parsedHour < 18
        ? "☀️"
        : "🌙";
  }

  getClock(hour) {
    const parsedHour = parseInt(hour, 10);
    const clocks = [
      "🕛",
      "🕐",
      "🕑",
      "🕒",
      "🕓",
      "🕔",
      "🕕",
      "🕖",
      "🕗",
      "🕘",
      "🕙",
      "🕚",
    ];
    return parsedHour >= 0 && parsedHour <= 23
      ? clocks[parsedHour % 12]
      : "Invalid hour";
  }
}

class TextFont {
  getFont1(text) {
    const fontMap = {
      a: "๐",
      b: "๑",
      c: "๒",
      d: "๓",
      e: "๔",
      f: "๕",
      g: "๖",
      h: "๗",
      i: "๘",
      j: "๙",
      k: "๐",
      l: "๑",
      m: "๒",
      n: "๓",
      o: "๔",
      p: "๕",
      q: "๖",
      r: "๗",
      s: "๘",
      t: "๙",
      u: "๐",
      v: "๑",
      w: "๒",
      x: "๓",
      y: "๔",
      z: "๕",
      A: "๐",
      B: "๑",
      C: "๒",
      D: "๓",
      E: "๔",
      F: "๕",
      G: "๖",
      H: "๗",
      I: "๘",
      J: "๙",
      K: "๐",
      L: "๑",
      M: "๒",
      N: "๓",
      O: "๔",
      P: "๕",
      Q: "๖",
      R: "๗",
      S: "๘",
      T: "๙",
      U: "๐",
      V: "๑",
      W: "๒",
      X: "๓",
      Y: "๔",
      Z: "๕",
      0: "๐",
      1: "๑",
      2: "๒",
      3: "๓",
      4: "๔",
      5: "๕",
      6: "๖",
      7: "๗",
      8: "๘",
      9: "๙",
      "°": "°",
      ":": ":",
      "/": "/",
      " ": " ",
      "(": "(",
      ")": ")",
      "⤿": "⤿",
      "★": "★",
      "☆": "☆",
      "༊": "༊",
      "*": "*",
      "·": "·",
      "˚": "˚",
      "꒰": "꒰",
      "꒱": "꒱",
      ˏ: "ˏ",
      ˋ: "ˋ",
      "´": "´",
      ˎ: "ˎ",
      "✦": "✦",
    };
    return text
      .split("")
      .map((char) => fontMap[char] || char)
      .join("");
  }

  getFont2(text) {
    const fontMap = {
      a: "𝕒",
      b: "𝕓",
      c: "𝕔",
      d: "𝕕",
      e: "𝕖",
      f: "𝕗",
      g: "𝕘",
      h: "𝕙",
      i: "𝕚",
      j: "𝕛",
      k: "𝕜",
      l: "𝕝",
      m: "𝕞",
      n: "𝕟",
      o: "𝕠",
      p: "𝕡",
      q: "𝕢",
      r: "𝕣",
      s: "𝕤",
      t: "𝕥",
      u: "𝕦",
      v: "𝕧",
      w: "𝕨",
      x: "𝕩",
      y: "𝕪",
      z: "𝕫",
      A: "𝔸",
      B: "𝔹",
      C: "ℂ",
      D: "𝔻",
      E: "𝔼",
      F: "𝔽",
      G: "𝔾",
      H: "ℍ",
      I: "𝕀",
      J: "𝕁",
      K: "𝕂",
      L: "𝕃",
      M: "𝕄",
      N: "ℕ",
      O: "𝕆",
      P: "ℙ",
      Q: "ℚ",
      R: "ℝ",
      S: "𝕊",
      T: "𝕋",
      U: "𝕌",
      V: "𝕍",
      W: "𝕎",
      X: "𝕏",
      Y: "𝕐",
      Z: "ℤ",
      0: "𝟘",
      1: "𝟙",
      2: "𝟚",
      3: "𝟛",
      4: "𝟜",
      5: "𝟝",
      6: "𝟞",
      7: "𝟟",
      8: "𝟠",
      9: "𝟡",
      "°": "°",
      ":": ":",
      "/": "/",
      " ": " ",
      "(": "(",
      ")": ")",
      "⤿": "⤿",
      "★": "★",
      "☆": "☆",
      "༊": "༊",
      "*": "*",
      "·": "·",
      "˚": "˚",
      "꒰": "꒰",
      "꒱": "꒱",
      ˏ: "ˏ",
      ˋ: "ˋ",
      "´": "´",
      ˎ: "ˎ",
      "✦": "✦",
    };
    return text
      .split("")
      .map((char) => fontMap[char] || char)
      .join("");
  }

  getFont3(text) {
    const fontMap = {
      a: "𝗮",
      b: "𝗯",
      c: "𝗰",
      d: "𝗱",
      e: "𝗲",
      f: "𝗳",
      g: "𝗴",
      h: "𝗵",
      i: "𝗶",
      j: "𝗷",
      k: "𝗸",
      l: "𝗹",
      m: "𝗺",
      n: "𝗻",
      o: "𝗼",
      p: "𝗽",
      q: "𝗾",
      r: "𝗿",
      s: "𝘀",
      t: "𝘁",
      u: "𝘂",
      v: "𝘃",
      w: "𝘄",
      x: "𝘅",
      y: "𝘆",
      z: "𝘇",
      A: "𝗔",
      B: "𝗕",
      C: "𝗖",
      D: "𝗗",
      E: "𝗘",
      F: "𝗙",
      G: "𝗚",
      H: "𝗛",
      I: "𝗜",
      J: "𝗝",
      K: "𝗞",
      L: "𝗟",
      M: "𝗠",
      N: "𝗡",
      O: "𝗢",
      P: "𝗣",
      Q: "𝗤",
      R: "𝗥",
      S: "𝗦",
      T: "𝗧",
      U: "𝗨",
      V: "𝗩",
      W: "𝗪",
      X: "𝗫",
      Y: "𝗬",
      Z: "𝗭",
      0: "𝟬",
      1: "𝟭",
      2: "𝟮",
      3: "𝟯",
      4: "𝟰",
      5: "𝟱",
      6: "𝟲",
      7: "𝟳",
      8: "𝟴",
      9: "𝟵",
      "°": "°",
      ":": ":",
      "/": "/",
      " ": " ",
      "(": "(",
      ")": ")",
      "⤿": "⤿",
      "★": "★",
      "☆": "☆",
      "༊": "༊",
      "*": "*",
      "·": "·",
      "˚": "˚",
      "꒰": "꒰",
      "꒱": "꒱",
      ˏ: "ˏ",
      ˋ: "ˋ",
      "´": "´",
      ˎ: "ˎ",
      "✦": "✦",
    };
    return text
      .split("")
      .map((char) => fontMap[char] || char)
      .join("");
  }

  getFont4(text) {
    const fontMap = {
      a: "𝒶",
      b: "𝒷",
      c: "𝒸",
      d: "𝒹",
      e: "𝑒",
      f: "𝒻",
      g: "𝑔",
      h: "𝒽",
      i: "𝒾",
      j: "𝒿",
      k: "𝓀",
      l: "𝓁",
      m: "𝓂",
      n: "𝓃",
      o: "𝑜",
      p: "𝓅",
      q: "𝓆",
      r: "𝓇",
      s: "𝓈",
      t: "𝓉",
      u: "𝓊",
      v: "𝓋",
      w: "𝓌",
      x: "𝓍",
      y: "𝓎",
      z: "𝓏",
      A: "𝒜",
      B: "ℬ",
      C: "𝒞",
      D: "𝒟",
      E: "ℰ",
      F: "ℱ",
      G: "𝒢",
      H: "ℋ",
      I: "ℐ",
      J: "𝒥",
      K: "𝒦",
      L: "ℒ",
      M: "ℳ",
      N: "𝒩",
      O: "𝒪",
      P: "𝒫",
      Q: "𝒬",
      R: "ℛ",
      S: "𝒮",
      T: "𝒯",
      U: "𝒰",
      V: "𝒱",
      W: "𝒲",
      X: "𝒳",
      Y: "𝒴",
      Z: "𝒵",
      0: "0",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      "°": "°",
      ":": ":",
      "/": "/",
      " ": " ",
      "(": "(",
      ")": ")",
      "⤿": "⤿",
      "★": "★",
      "☆": "☆",
      "༊": "༊",
      "*": "*",
      "·": "·",
      "˚": "˚",
      "꒰": "꒰",
      "꒱": "꒱",
      ˏ: "ˏ",
      ˋ: "ˋ",
      "´": "´",
      ˎ: "ˎ",
      "✦": "✦",
    };
    return text
      .split("")
      .map((char) => fontMap[char] || char)
      .join("");
  }

  getFont5(text) {
    const fontMap = {
      a: "𝓪",
      b: "𝓫",
      c: "𝓬",
      d: "𝓭",
      e: "𝓮",
      f: "𝓯",
      g: "𝓰",
      h: "𝓱",
      i: "𝓲",
      j: "𝓳",
      k: "𝓴",
      l: "𝓵",
      m: "𝓶",
      n: "𝓷",
      o: "𝓸",
      p: "𝓹",
      q: "𝓺",
      r: "𝓻",
      s: "𝓼",
      t: "𝓽",
      u: "𝓾",
      v: "𝓿",
      w: "𝔀",
      x: "𝔁",
      y: "𝔂",
      z: "𝔃",
      A: "𝓐",
      B: "𝓑",
      C: "𝓒",
      D: "𝓓",
      E: "𝓔",
      F: "𝓕",
      G: "𝓖",
      H: "𝓗",
      I: "𝓘",
      J: "𝓙",
      K: "𝓚",
      L: "𝓛",
      M: "𝓜",
      N: "𝓝",
      O: "𝓞",
      P: "𝓟",
      Q: "𝓠",
      R: "𝓡",
      S: "𝓢",
      T: "𝓣",
      U: "𝓤",
      V: "𝓥",
      W: "𝓦",
      X: "𝓧",
      Y: "𝓨",
      Z: "𝓩",
      0: "0",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      "°": "°",
      ":": ":",
      "/": "/",
      " ": " ",
      "(": "(",
      ")": ")",
      "⤿": "⤿",
      "★": "★",
      "☆": "☆",
      "༊": "༊",
      "*": "*",
      "·": "·",
      "˚": "˚",
      "꒰": "꒰",
      "꒱": "꒱",
      ˏ: "ˏ",
      ˋ: "ˋ",
      "´": "´",
      ˎ: "ˎ",
      "✦": "✦",
    };
    return text
      .split("")
      .map((char) => fontMap[char] || char)
      .join("");
  }

  getFont6(text) {
    const fontMap = {
      a: "ⓐ",
      b: "ⓑ",
      c: "ⓒ",
      d: "ⓓ",
      e: "ⓔ",
      f: "ⓕ",
      g: "ⓖ",
      h: "ⓗ",
      i: "ⓘ",
      j: "ⓙ",
      k: "ⓚ",
      l: "ⓛ",
      m: "ⓜ",
      n: "ⓝ",
      o: "ⓞ",
      p: "ⓟ",
      q: "ⓠ",
      r: "ⓡ",
      s: "ⓢ",
      t: "ⓣ",
      u: "ⓤ",
      v: "ⓥ",
      w: "ⓦ",
      x: "ⓧ",
      y: "ⓨ",
      z: "ⓩ",
      A: "Ⓐ",
      B: "Ⓑ",
      C: "Ⓒ",
      D: "Ⓓ",
      E: "Ⓔ",
      F: "Ⓕ",
      G: "Ⓖ",
      H: "Ⓗ",
      I: "Ⓘ",
      J: "Ⓙ",
      K: "Ⓚ",
      L: "Ⓛ",
      M: "Ⓜ",
      N: "Ⓝ",
      O: "Ⓞ",
      P: "Ⓟ",
      Q: "Ⓠ",
      R: "Ⓡ",
      S: "Ⓢ",
      T: "Ⓣ",
      U: "Ⓤ",
      V: "Ⓥ",
      W: "Ⓦ",
      X: "Ⓧ",
      Y: "Ⓨ",
      Z: "Ⓩ",
      0: "⓪",
      1: "①",
      2: "②",
      3: "③",
      4: "④",
      5: "⑤",
      6: "⑥",
      7: "⑦",
      8: "⑧",
      9: "⑨",
      "°": "°",
      ":": ":",
      "/": "/",
      " ": " ",
      "(": "(",
      ")": ")",
      "⤿": "⤿",
      "★": "★",
      "☆": "☆",
      "༊": "༊",
      "*": "*",
      "·": "·",
      "˚": "˚",
      "꒰": "꒰",
      "꒱": "꒱",
      ˏ: "ˏ",
      ˋ: "ˋ",
      "´": "´",
      ˎ: "ˎ",
      "✦": "✦",
    };
    return text
      .split("")
      .map((char) => fontMap[char] || char)
      .join("");
  }
}

class ModClient extends Client {
  constructor(token, config, info) {
    try {
      const ClientUserSettingManager = require("discord.js-selfbot-v13/src/managers/ClientUserSettingManager");
      if (
        ClientUserSettingManager &&
        ClientUserSettingManager.prototype &&
        ClientUserSettingManager.prototype._patch
      ) {
        const originalPatch = ClientUserSettingManager.prototype._patch;
        ClientUserSettingManager.prototype._patch = function (data) {
          if (!data) data = {};
          if (!data.friend_source_flags) {
            data.friend_source_flags = { all: false };
          }
          return originalPatch.call(this, data);
        };
        console.log("Successfully patched ClientUserSettingManager before client creation");
      }
    } catch (error) {
      console.warn("Pre-patching attempt failed:", error.message);
    }

    super({
      checkUpdate: false,
      autoRedeemNitro: false,
      captchaKey: null,
      captchaService: null,
      DMSync: false,
      cloudStreamingKill: true,
      browser: "Chrome",
      patchVoice: false,
      keepAlive: true,
      sweepers: {
        messages: {
          interval: 120,
          lifetime: 60,
        },
      },
      ws: {
        properties: {
          browser: "Chrome",
          os: "Windows",
          device: "Chrome",
        },
        reconnect: true,
        intents: 32767,
      },
      rest: {
        userAgentAppendix: "Discord-Selfbot/1.0.0",
        timeout: 30000,
        retries: 3,
      },
      messageCacheMaxSize: 5,
      messageCacheLifetime: 60,
      messageSweepInterval: 120,
    });

    // Parse config structure - support multiple config formats
    const inputs = config.INPUTS || config.inputs || [{}];
    const input = Array.isArray(inputs) ? inputs[0] : inputs;
    const options = config.OPTIONS || config.options || config.setup || {};

    // Try to get RPC config from various possible locations
    let rpcConfig = null;
    if (config.RPC && typeof config.RPC === 'object') {
      rpcConfig = config.RPC;
      console.log("Using config.RPC");
    } else if (config.rpc && typeof config.rpc === 'object') {
      rpcConfig = config.rpc;
      console.log("Using config.rpc");
    } else if (config.config && typeof config.config === 'object') {
      rpcConfig = config.config;
      console.log("Using config.config");
    } else {
      rpcConfig = config;
      console.log("Using config directly as fallback");
    }

    this.TOKEN = token;
    this.config = config;
    this.targetTime = info.wait;

    // Feature flags
    this.activityType = input.activity?.type || "STREAMING";

    // RPC configuration (merged with old config structure)
    this.rpcConfig = {
      delay: rpcConfig?.delay || (config.setup?.delay ? config.setup.delay * 1000 : 10000),
      timestamp: rpcConfig?.timestamp || {},
      twitchURL: rpcConfig?.TwitchURL || rpcConfig?.twitchURL || "",
      youtubeURL: rpcConfig?.YoutubeURL || rpcConfig?.youtubeURL || "",
      name: rpcConfig?.name || [],
      state: rpcConfig?.state || [],
      details: rpcConfig?.details || [],
      assetsLargeText: rpcConfig?.assetsLargeText || [],
      assetsSmallText: rpcConfig?.assetsSmallText || [],
      assetsLargeImage: rpcConfig?.assetsLargeImage || [],
      assetsSmallImage: rpcConfig?.assetsSmallImage || [],
      buttonFirst: rpcConfig?.buttonFirst || [],
      buttonSecond: rpcConfig?.buttonSecond || []
    };

    this.intervals = new Set();
    this.weather = new Weather(options.location || options.city || options.tz || "Asia/Bangkok");
    this.sys = new SystemInfo();
    this.emoji = new Emoji();
    this.textFont = new TextFont();
    this.getExternal = new GetImage(this);
    this.cacheImage = new Map();

    this.lib = {
      count: 0,
      countParty: 1,
      timestamp: 0,
      v: { patch: info.version },
    };

    this.index = {
      url: 0,
      name: 0,
      state: 0,
      details: 0,
      assetsLargeText: 0,
      assetsSmallText: 0,
      assetsLargeImage: 0,
      assetsSmallImage: 0,
      bt_1: 0,
      bt_2: 0,
    };

    this.lastRestartTime = 0;
    this.restartCount = 0;
    this.lastConnectionCheck = Date.now();
    this.isRunningStream = false;

    this.on("disconnect", () => {
      console.log(`Client disconnected for token: ${this.maskToken(this.TOKEN)}`);
    });

    this.on("reconnecting", () => {
      console.log(`Client reconnecting for token: ${this.maskToken(this.TOKEN)}`);
    });

    this.on("resumed", () => {
      console.log(`Client resumed for token: ${this.maskToken(this.TOKEN)}`);
    });

    this.on("ready", this._onReady.bind(this));
    this.on("error", this._onError.bind(this));
  }

  _onReady() {
    if (!this.user.settings) {
      console.log("Creating missing settings object");
      this.user.settings = {
        friend_source_flags: { all: true },
        custom_status: null,
        status: "online",
      };
    } else if (!this.user.settings.friend_source_flags) {
      console.log("Adding missing friend_source_flags");
      this.user.settings.friend_source_flags = { all: true };
    }

    if (this.user.settings && this.user.settings._patch) {
      const originalPatch = this.user.settings._patch;
      this.user.settings._patch = function (data) {
        if (!data) data = {};
        if (!data.friend_source_flags) {
          data.friend_source_flags = { all: false };
        }
        return originalPatch.call(this, data);
      };
      console.log("Patched settings._patch method");
    }

    this.restartCount = 0;

    this.startPingChecker();
  }

  _onError(error) {
    console.error("Client encountered an error:", error);
    if (error.message.includes("Cannot read properties of null")) {
      console.log("Attempting to recover from null property error...");
      if (this.user && !this.user.settings) {
        this.user.settings = {
          friend_source_flags: { all: true },
          custom_status: null,
          status: "online",
        };
      } else if (
        this.user &&
        this.user.settings &&
        !this.user.settings.friend_source_flags
      ) {
        this.user.settings.friend_source_flags = { all: true };
      }
    }
  }

  startPingChecker() {
    const checkerId = setInterval(() => {
      if (this.isRunningStream) return;

      try {
        if (this.ws && this.ws.status === 0 && this.ws.ping < 3000) {
          if (this.restartCount > 0) {
            console.log(
              `Connection stabilized for token: ${this.maskToken(this.TOKEN)}`
            );
            this.restartCount = 0;
          }
        }
      } catch (err) {
        console.error(`Error in ping checker: ${err.message}`);
      }
    }, 30000);

    this.intervals.add(checkerId);
  }

  async streaming() {
    if (this.isRunningStream) {
      console.log(`Streaming update is already in progress for ${this.maskToken(this.TOKEN)}`);
      return;
    }

    this.isRunningStream = true;
    try {
      if (!this.config) {
        console.error("No config available for streaming");
        this.isRunningStream = false;
        return;
      }

      const currentTime = Date.now();
      let connectionHasIssues = false;

      if (this.ws && this.ws.status === 3) {
        console.log("Client is connecting, waiting for connection to establish...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (!this.ws || (this.ws.status !== 0 && this.ws.status !== 3)) {
        console.log(`Client not properly connected (status: ${this.ws?.status || "unknown"})`);
        connectionHasIssues = true;
      } else if (this.ws.status === 3) {
        console.log("Client still connecting after wait period, treating as connection issue");
        connectionHasIssues = true;
      } else if (this.ws.ping > 5000) {
        console.log(`High ping detected: ${this.ws.ping}ms`);
        connectionHasIssues = true;
      }

      if (connectionHasIssues) {
        if (this.restartCount < 5 && currentTime - this.lastRestartTime > 60000) {
          this.lastRestartTime = currentTime;
          this.restartCount++;
          console.log(`Connection issues detected, reconnection attempt #${this.restartCount}`);

          const backoffDelay = Math.min(30000, Math.pow(2, this.restartCount) * 2500);
          const totalDelay = Math.max(backoffDelay, 10000);

          console.log(`Waiting ${totalDelay}ms before next attempt...`);
          setTimeout(() => this.streaming(), totalDelay);
          this.updateIndices();
          this.isRunningStream = false;
          return;
        } else if (this.restartCount >= 5) {
          console.log(`Too many reconnection attempts, will try again in 15 minutes`);
          setTimeout(() => {
            if (Date.now() - this.lastRestartTime > 15 * 60 * 1000) {
              console.log("Resetting restart count after cooldown");
              this.restartCount = 0;
            }
            this.streaming();
          }, 15 * 60 * 1000);
          this.isRunningStream = false;
          return;
        }
      }

      // Get streaming URL from rpcConfig
      const watchUrls = [];
      if (this.rpcConfig.twitchURL) watchUrls.push(this.rpcConfig.twitchURL);
      if (this.rpcConfig.youtubeURL) watchUrls.push(this.rpcConfig.youtubeURL);

      let watchUrl = null;
      if (watchUrls.length > 0) {
        watchUrl = watchUrls[this.index.url % watchUrls.length];
      }

      if (this.activityType === "STREAMING") {
        if (!watchUrl || !this.getExternal.isValidURL(watchUrl)) {
          console.warn("No valid streaming URL found. Using fallback URL.");
          watchUrl = "https://www.twitch.tv/4levy_z1";
        }
      }

      let platform = "";
      if (watchUrl) {
        if (watchUrl.includes("twitch.tv")) {
          platform = "Twitch";
        } else if (watchUrl.includes("youtube.com") || watchUrl.includes("youtu.be")) {
          platform = "YouTube";
        } else if (watchUrl.includes("spotify.com")) {
          platform = "Spotify";
        } else {
          platform = "Custom";
        }
      }

      const presence = new RichPresence(this)
        .setApplicationId(this.config.config?.options?.botid || "1109522937989562409")
        .setType(this.activityType);

      // Handle LISTENING activity type with timestamp
      if (this.activityType === "LISTENING") {
        if (this.rpcConfig.timestamp && this.rpcConfig.timestamp.start && this.rpcConfig.timestamp.end) {
          const start = this.parseTimestamp(this.rpcConfig.timestamp.start);
          const end = this.parseTimestamp(this.rpcConfig.timestamp.end);
          if (start && end) {
            const total = end - start;
            const current = Date.now() % total;
            presence.setStartTimestamp(Date.now() - current)
              .setEndTimestamp(Date.now() + (total - current));
          }
        }
      } else if (this.activityType === "STREAMING" && watchUrl) {
        presence.setURL(watchUrl);
      }

      const nameText = this.getNextItem(this.rpcConfig.name, 'name');
      const details = this.getNextItem(this.rpcConfig.details, 'details');
      let activityName;

      if (this.activityType === "STREAMING" && platform) {
        activityName = platform;
      } else {
        if (nameText) {
          activityName = this.SPT(nameText);
        } else if (this.activityType === "LISTENING" && details) {
          activityName = this.SPT(details);
        } else {
          const effectivePlatform = this.activityType === "LISTENING" ? null : platform;
          activityName = this.getDefaultActivityName(this.activityType, effectivePlatform);
        }
      }

      presence.setName(activityName);

      // Set details (the first line under the activity name)
      if (details) {
        presence.setDetails(this.SPT(details));
      }

      // Set state (the second line under the activity name)
      const state = this.getNextItem(this.rpcConfig.state, 'state');
      if (state) {
        presence.setState(this.SPT(state));
      }

      const largeText = this.getNextItem(this.rpcConfig.assetsLargeText, 'assetsLargeText');
      if (largeText) {
        presence.setAssetsLargeText(this.SPT(largeText));
      }

      const smallText = this.getNextItem(this.rpcConfig.assetsSmallText, 'assetsSmallText');
      if (smallText) {
        presence.setAssetsSmallText(this.SPT(smallText));
      }

      const largeImage = this.getNextItem(this.rpcConfig.assetsLargeImage, 'assetsLargeImage');
      const smallImage = this.getNextItem(this.rpcConfig.assetsSmallImage, 'assetsSmallImage');

      if (largeImage || smallImage) {
        try {
          const images = await this.getImage(largeImage, smallImage);
          if (images.bigImage) {
            presence.setAssetsLargeImage(images.bigImage);
          }
          if (images.smallImage) {
            presence.setAssetsSmallImage(images.smallImage);
          }
        } catch (imgError) {
          console.warn(`Failed to set images: ${imgError.message}`);
        }
      }

      // Handle timestamp for non-LISTENING types
      if (this.activityType !== "LISTENING" && this.rpcConfig.timestamp && (this.rpcConfig.timestamp.start || this.rpcConfig.timestamp.end)) {
        if (this.rpcConfig.timestamp.start) {
          const start = this.parseTimestamp(this.rpcConfig.timestamp.start);
          if (start) presence.setStartTimestamp(start);
        }
        if (this.rpcConfig.timestamp.end) {
          const end = this.parseTimestamp(this.rpcConfig.timestamp.end);
          if (end) presence.setEndTimestamp(end);
        }
      }

      // Add buttons with support for both label and name fields
      if (this.rpcConfig.buttonFirst && this.rpcConfig.buttonFirst.length > 0) {
        try {
          const button1 = this.rpcConfig.buttonFirst[this.index.bt_1 % this.rpcConfig.buttonFirst.length];
          if (button1 && (button1.label || button1.name) && button1.url) {
            presence.addButton(this.SPT(button1.label || button1.name), button1.url);
          }
        } catch (buttonError) {
          console.warn(`Failed to add button 1: ${buttonError.message}`);
        }
      }

      if (this.rpcConfig.buttonSecond && this.rpcConfig.buttonSecond.length > 0) {
        try {
          const button2 = this.rpcConfig.buttonSecond[this.index.bt_2 % this.rpcConfig.buttonSecond.length];
          if (button2 && (button2.label || button2.name) && button2.url) {
            presence.addButton(this.SPT(button2.label || button2.name), button2.url);
          }
        } catch (buttonError) {
          console.warn(`Failed to add button 2: ${buttonError.message}`);
        }
      }

      try {
        await this.user?.setPresence({
          activities: [presence],
          status: "online",
        });
      } catch (presenceError) {
        console.error(`Failed to update presence: ${presenceError.message}`);
      }

      this.updateIndices();

      const nextUpdateDelay = Math.max(5000, this.rpcConfig.delay);
      setTimeout(() => this.streaming(), nextUpdateDelay);
    } catch (error) {
      console.error(`Error in streaming method: ${error.message}`);
      setTimeout(() => this.streaming(), 30000);
    } finally {
      this.isRunningStream = false;
    }
  }

  updateIndices() {
    this.lib.count++;
    this.lib.countParty++;

    const urlCount = [this.rpcConfig.twitchURL, this.rpcConfig.youtubeURL].filter(Boolean).length;
    this.index.url = (this.index.url + 1) % Math.max(1, urlCount);

    this.index.bt_1 = (this.index.bt_1 + 1) % Math.max(1, this.rpcConfig.buttonFirst?.length || 1);
    this.index.bt_2 = (this.index.bt_2 + 1) % Math.max(1, this.rpcConfig.buttonSecond?.length || 1);
  }

  getDefaultActivityName(activityType, platform) {
    if (platform) return platform;

    switch (activityType) {
      case "STREAMING":
        return "Streaming";
      case "PLAYING":
        return "Playing";
      case "LISTENING":
        return "Listening to";
      case "WATCHING":
        return "Watching";
      case "COMPETING":
        return "Competing in";
      default:
        return "Activity";
    }
  }

  getNextItem(array, indexKey) {
    if (!array) return null;
    if (!Array.isArray(array)) return array;
    if (array.length === 0) return null;
    const item = array[this.index[indexKey] % array.length];
    this.index[indexKey]++;
    return item;
  }

  parseTimestamp(timestamp) {
    if (!timestamp) return null;
    if (typeof timestamp === 'number') return timestamp;
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return date.getTime();
    }
    return null;
  }

  startInterval(callback, interval) {
    const id = setInterval(callback, interval);
    this.intervals.add(id);
    return id;
  }

  stopAllIntervals() {
    for (let id of this.intervals) clearInterval(id);
    this.intervals.clear();
  }

  maskToken(token) {
    const parts = token.split(".");
    if (parts.length < 2) return token;
    return `${parts[0]}.##########`;
  }

  async getImage(bigImg, smallImg) {
    try {
      const processedBigImg = await this.SPT(bigImg);
      const processedSmallImg = await this.SPT(smallImg);

      const cachedBigImage = this.cacheImage.get(processedBigImg);
      const cachedSmallImage = this.cacheImage.get(processedSmallImg);


      let fetchedImages = { bigImage: null, smallImage: null };
      try {
        fetchedImages = await this.getExternal.get(processedBigImg, processedSmallImg);

      } catch (error) {
      }

      const finalBigImage = fetchedImages.bigImage || cachedBigImage || null;
      const finalSmallImage = fetchedImages.smallImage || cachedSmallImage || null;

      if (fetchedImages.bigImage) {
        this.cacheImage.set(processedBigImg, fetchedImages.bigImage);
      }
      if (fetchedImages.smallImage) {
        this.cacheImage.set(processedSmallImg, fetchedImages.smallImage);
      }

      return { bigImage: finalBigImage, smallImage: finalSmallImage };
    } catch (error) {
      return { bigImage: null, smallImage: null };
    }
  }


  replaceVariables(text, variables) {
    if (!text) return text;

    const map = new Map(Object.entries(variables));
    return text.replace(/\{([^{}]+)\}/g, (match, key) => {
      const funcMatch = key.match(/^(\w+)\((.+)\)$/);
      if (funcMatch) {
        const [, funcName, args] = funcMatch;
        const func = map.get(funcName);
        if (typeof func === "function") {
          try {
            return func(args.trim());
          } catch (err) {
            console.warn(`Error in function ${funcName}: ${err.message}`);
            return match;
          }
        }
      }
      const [varName, defaultValue] = key.split("=");
      if (defaultValue) {
        const [funcName, ...params] = defaultValue.split(":");
        const func = map.get(`${varName}=${funcName}`);
        if (typeof func === "function") {
          try {
            return func(match, ...params);
          } catch (err) {
            console.warn(
              `Error in function ${varName}=${funcName}: ${err.message}`
            );
            return match;
          }
        }
      }
      return map.has(key) ? map.get(key) : match;
    });
  }


  SPT(text) {
    if (!text) return text || null;

    try {
      const { weather, sys, emoji, textFont, lib } = this;

      const userTimezone = this.config?.OPTIONS?.tz || this.weather?.timezone || "Asia/Bangkok";

      const currentMoment = moment()
        .locale("th")
        .tz(userTimezone);

      const day = currentMoment.date();
      const daySuffix = (d) => {
        if (d > 3 && d < 21) return "th";
        switch (d % 10) {
          case 1: return "st";
          case 2: return "nd";
          case 3: return "rd";
          default: return "th";
        }
      };
      const dayWithSuffix = `${day}${daySuffix(day)}`;

      const currentMomentEN = currentMoment.clone().locale("en");

      const variables = {
        // Time
        "hour:1": currentMoment.format("HH"),
        "hour:2": currentMoment.format("hh"),
        "min:1": currentMoment.format("mm"),
        "min:2": currentMoment.format("mm A"),
        "day:en": dayWithSuffix,

        // Time (EN)
        "time:en:24": currentMomentEN.format("HH:mm"),
        "time:en:12": currentMomentEN.format("hh:mm A"),
        "hour:en": currentMomentEN.format("hh"),
        "minute:en": currentMomentEN.format("mm"),
        "ampm:en": currentMomentEN.format("A"),

        // Thai Date
        "th=date": currentMoment.format("D"),
        "th=week:1": currentMoment.format("ddd"),
        "th=week:2": currentMoment.format("dddd"),
        "th=month:1": currentMoment.format("M"),
        "th=month:2": currentMoment.format("MMM"),
        "th=month:3": currentMoment.format("MMMM"),
        "th=year:1": (parseInt(currentMoment.format("YYYY")) + 543).toString().slice(-2),
        "th=year:2": (parseInt(currentMoment.format("YYYY")) + 543).toString(),

        // English Date
        "en=date": currentMoment.locale("en").format("Do"),
        "en=week:1": currentMoment.locale("en").format("ddd"),
        "en=week:2": currentMoment.locale("en").format("dddd"),
        "en=month:1": currentMoment.locale("en").format("M"),
        "en=month:2": currentMoment.locale("en").format("MMM"),
        "en=month:3": currentMoment.locale("en").format("MMMM"),
        "en=year:1": currentMoment.locale("en").format("YY"),
        "en=year:2": currentMoment.locale("en").format("YYYY"),

        // Weather - using defaults if data isn't loaded yet
        city: weather.city || "Unknown",
        region: weather.region || "",
        country: weather.country || "",
        "temp:c": weather.temp_c || 0,
        "temp:f": weather.temp_f || 32,
        "wind:kph": weather.wind_kph || 0,
        "wind:mph": weather.wind_mph || 0,
        "wind:degree": weather.wind_degree || 0,
        "wind:dir": weather.wind_dir || "N",
        "pressure:mb": weather.pressure_mb || 1013,
        "pressure:in": weather.pressure_in || 29.92,
        "precip:mm": weather.precip_mm || 0,
        "precip:in": weather.precip_in || 0,
        "gust:kph": weather.gust_kph || 0,
        "gust:mph": weather.gust_mph || 0,
        "feelslike:c": weather.feelslike_c || 0,
        "feelslike:f": weather.feelslike_f || 32,
        "windchill:c": weather.windchill_c || 0,
        "windchill:f": weather.windchill_f || 32,
        "heatindex:c": weather.heatindex_c || 0,
        "heatindex:f": weather.heatindex_f || 32,
        "dewpoint:c": weather.dewpoint_c || 0,
        "dewpoint:f": weather.dewpoint_f || 32,
        "vis:km": weather.vis_km || 10,
        "vis:mi": weather.vis_miles || 6.2,
        humidity: weather.humidity || 50,
        cloud: weather.cloud || 0,
        uv: weather.uv || 0,
        co: weather.co || 0,
        no2: weather.no2 || 0,
        o3: weather.o3 || 0,
        so2: weather.so2 || 0,
        "pm2.5": weather.pm2_5 || 0,
        pm10: weather.pm10 || 0,

        // System
        "ping": Math.round(this.ws?.ping || 0),
        "patch": lib.v.patch || "1.0.0",
        "cpu:name": sys.cpuname || sys.cpuName || "CPU",
        "cpu:cores": sys.cpucores || sys.cpuCores || 1,
        "cpu:speed": sys.cpuspeed || sys.cpuSpeedGHz || "0.0",
        "cpu:usage": sys.cpu || sys.cpuUsage || 0,
        "ram:usage": sys.ram || sys.ramUsage || 0,
        "uptime:days": Math.trunc((this.uptime || 0) / 86400000),
        "uptime:hours": Math.trunc(((this.uptime || 0) / 3600000) % 24),
        "uptime:minutes": Math.trunc(((this.uptime || 0) / 60000) % 60),
        "uptime:seconds": Math.trunc(((this.uptime || 0) / 1000) % 60),

        // User
        "user:name": this.user?.username || "User",
        "user:icon": this.user?.displayAvatarURL() || "",
        "user:banner": this.user?.bannerURL() || "",
        "guild=members": (guildId) => {
          try {
            return this.guilds.cache.get(guildId)?.memberCount || "?";
          } catch (e) {
            return "?";
          }
        },
        "guild=name": (guildId) => {
          try {
            return this.guilds.cache.get(guildId)?.name || "Unknown";
          } catch (e) {
            return "Unknown";
          }
        },
        "guild=icon": (guildId) => {
          try {
            return this.guilds.cache.get(guildId)?.iconURL() || "";
          } catch (e) {
            return "";
          }
        },
        "emoji:random": () => emoji.random(),
        "emoji:time": emoji.getTime(currentMoment.format("HH")),
        "emoji:clock": () => emoji.getClock(currentMoment.format("HH")),
        random: (text) => {
          try {
            const options = text.split(",").map((t) => t.trim());
            return options[Math.floor(Math.random() * options.length)];
          } catch (e) {
            return text;
          }
        },
      };

      const processFont = (fontNum, content) => {
        try {
          const processedContent = content.replace(
            /\{([^{}]+)\}/g,
            (_, key) => (variables[key] !== undefined ? variables[key] : key)
          );
          return (
            textFont[`getFont${fontNum}`]?.(processedContent) ||
            processedContent
          );
        } catch (e) {
          return content;
        }
      };

      const processText = (input) => {
        try {
          return input
            .replace(/\{NF(\d)\((.*?)\)\}/g, (_, num, content) => {
              return processFont(num, content);
            })
            .replace(/\{([^{}]+)\}/g, (_, key) => (variables[key] !== undefined ? variables[key] : key));
        } catch (e) {
          return input;
        }
      };

      let result = text;
      let prev;
      let iterations = 0;
      const MAX_ITERATIONS = 5;

      do {
        prev = result;
        result = processText(prev);
        iterations++;
      } while (result !== prev && iterations < MAX_ITERATIONS);

      return result;
    } catch (error) {
      console.error(`Error in SPT: ${error.message}`);
      return text;
    }
  }

  async start() {
    try {
      try {
        await this.weather.update();
        await this.sys.update();
      } catch (initError) {
        console.warn(`Info initialization error: ${initError.message}`);
      }

      const originalLoginMethod = this.login;
      this.login = async function (token) {
        try {
          try {
            const path = require.resolve("discord.js-selfbot-v13");
            const basePath = path.substring(
              0,
              path.indexOf("node_modules") + "node_modules".length
            );
            const READYPath = `${basePath}/discord.js-selfbot-v13/src/client/websocket/handlers/READY`;
            const READY = require(READYPath);

            const originalHandler = READY.exports;

            READY.exports = function (client, packet) {
              if (packet && packet.d && packet.d.user_settings) {
                if (!packet.d.user_settings.friend_source_flags) {
                  console.log(
                    "Patching missing friend_source_flags in READY packet"
                  );
                  packet.d.user_settings.friend_source_flags = { all: false };
                }
              }
              return originalHandler(client, packet);
            };
            console.log("Successfully patched READY handler");
          } catch (e) {
            console.warn("Failed to patch READY handler:", e.message);
          }

          return await originalLoginMethod.call(this, token);
        } catch (loginError) {
          console.error("Login error:", loginError.message);

          if (loginError.message.includes("Cannot read properties of null")) {
            console.log("Applying emergency patch for friend_source_flags...");

            try {
              const ClientUserSettingManager = require("discord.js-selfbot-v13/src/managers/ClientUserSettingManager");
              const originalPatch = ClientUserSettingManager.prototype._patch;

              ClientUserSettingManager.prototype._patch = function (data) {
                if (!data) data = {};
                if (!data.friend_source_flags) {
                  data.friend_source_flags = { all: false };
                }
                return originalPatch.call(this, data);
              };
              console.log("Applied emergency patch, trying login again");

              return await originalLoginMethod.call(this, token);
            } catch (e) {
              console.error("Emergency patch failed:", e.message);
              throw loginError;
            }
          }

          throw loginError;
        }
      };

      await this.login(this.TOKEN);

      const delay = Math.max(0, this.targetTime - Date.now());
      await new Promise((resolve) => setTimeout(resolve, delay));

      this.lib.timestamp = Date.now();
      const updateInterval = 1000 * (this.config.setup?.delay || 10);
      this.startInterval(() => this.sys.update(), updateInterval);

      await this.streaming();

      return {
        success: true,
        username: this.user?.tag || "Unknown",
      };
    } catch (error) {
      console.error("Client start error:", error);
      this.destroy();
      const errorMessage = error.message.toUpperCase().replace(/\./g, "");
      console.log(`[-] ${this.maskToken(this.TOKEN)} : ${errorMessage}`.red);

      if (error.message.includes("Cannot read properties of null")) {
        console.log(
          "This appears to be an API compatibility issue. Trying alternative method..."
            .yellow
        );
        return { success: false, reason: "api_compatibility" };
      }

      return { success: false };
    }
  }

  end() {
    try {
      this.stopAllIntervals();
      this.destroy();
    } catch (error) {
      console.error(`Error during client cleanup: ${error.message}`);
    }
  }
}

const MemoryManager = require("./memoryManager");

const statusChecks = new Map();
const activeStreamsManager = require("../database/activeStreams");

class StreamManager {
  constructor() {
    this.activeStreams = new Map();
    this.userConfigs = new Map();
    this.failedTokens = new Map();
    this.setupMemoryMonitoring();
  }

  setupMemoryMonitoring() {
    setInterval(async () => {
      await MemoryManager.monitorAndCleanup();

      if (MemoryManager.checkMemoryUsage().percentage > 95) {
        await this.restartProblematicStreams();
      }
    }, 60000);
  }

  async restartProblematicStreams() {
    const restartedClients = new Map();

    for (const [userId, clients] of this.activeStreams.entries()) {
      for (const [token, client] of clients.entries()) {
        const clientKey = `${userId}-${token}`;
        const lastRestart = restartedClients.get(clientKey) || 0;
        const currentTime = Date.now();

        if (currentTime - lastRestart < 15 * 60 * 1000) {
          continue;
        }

        if (client.ws.ping > 5000 || client.ws.status === 5) {
          console.log(
            `Restarting stream for token due to connectivity issues: ${this.maskToken(
              token
            )}`
          );
          await this.restartStream(userId, token, client.config);

          restartedClients.set(clientKey, currentTime);
        }
      }
    }
  }

  async restartStream(userId, token, config) {
    try {
      const clients = this.activeStreams.get(userId);
      if (!clients) return;

      const client = clients.get(token);
      if (!client) return;

      console.log(`Cleaning up client for token: ${this.maskToken(token)}`);
      client.end();
      clients.delete(token);

      await MemoryManager.cleanupMemory();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      console.log(`Creating new client for token: ${this.maskToken(token)}`);
      const newClient = new ModClient(token, config, {
        wait: Date.now(),
        version: "1.0.0",
      });

      try {
        const result = await newClient.start();
        if (result.success) {
          clients.set(token, newClient);
          console.log(
            `Successfully restarted client for token: ${this.maskToken(token)}`
          );
        } else {
          console.log(
            `Failed to restart client for token: ${this.maskToken(token)}`
          );
        }
      } catch (startError) {
        console.error(`Error starting new client: ${startError.message}`);
      }
    } catch (error) {
      console.error(`Error in restartStream: ${error}`);
    }
  }

  async startStream(userId, tokens, config) {
    await this.stopStream(userId);

    try {
      this.failedTokens.set(userId, []);

      const clientInstances = new Map();
      let successCount = 0;
      let failedCount = 0;

      const userSpecificConfig = JSON.parse(JSON.stringify(config));

      this.userConfigs.set(userId, userSpecificConfig);

      for (const token of tokens) {
        try {
          if (
            !token.value ||
            typeof token.value !== "string" ||
            token.value.split(".").length !== 3
          ) {
            console.log(
              `Invalid token format for user ${userId}: ${this.maskToken(
                token.value
              )}`
            );
            this.failedTokens.get(userId).push({
              value: token.value,
              reason: "Invalid token format",
            });
            failedCount++;
            continue;
          }

          const client = new ModClient(token.value, userSpecificConfig, {
            wait: Date.now(),
            version: "1.0.0",
          });

          client.on("error", (error) => {
            console.error(
              `Client error for token ${this.maskToken(token.value)}:`,
              error
            );
          });

          const result = await client.start();
          if (result.success) {
            clientInstances.set(token.value, client);
            successCount++;
            console.log(`[+] READY : [${result.username}]`.green);
          } else {
            failedCount++;
            this.failedTokens.get(userId).push({
              value: token.value,
              reason: result.reason || "Unknown error",
            });
            console.log(
              `[-] ${this.maskToken(token.value)} : Failed to start`.red
            );
          }
        } catch (error) {
          failedCount++;
          this.failedTokens.get(userId).push({
            value: token.value,
            reason: error.message,
          });
          console.error(
            `Error with token ${this.maskToken(token.value)}:`,
            error
          );
        }
      }

      if (successCount > 0) {
        this.activeStreams.set(userId, clientInstances);
        activeStreamsManager.addUser(userId);
        console.log(`Added user ${userId} to active streams`);

        return {
          success: true,
          successCount,
          failedCount,
          totalCount: tokens.length,
        };
      }

      return {
        success: false,
        failedCount,
        totalCount: tokens.length,
        failedTokens: this.failedTokens.get(userId),
      };
    } catch (error) {
      console.error(`Stream start error for user ${userId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async stopStream(userId) {
    const clients = this.activeStreams.get(userId);
    if (clients) {
      try {
        for (const client of clients.values()) {
          client.end();
        }
        this.activeStreams.delete(userId);
        activeStreamsManager.removeUser(userId);
        console.log(`Removed user ${userId} from active streams`);
        return true;
      } catch (error) {
        console.error(`Error stopping streams for user ${userId}:`, error);
        return false;
      }
    }
    return false;
  }

  isStreaming(userId) {
    return statusChecks.has(userId);
  }

  startStatusCheck(userId) {
    if (statusChecks.has(userId)) return;

    const checkInterval = setInterval(async () => {
      const streaming = await this.checkStreamingStatus(userId);
      if (!streaming) {
        this.stopStatusCheck(userId);
      }
    }, 10000);

    statusChecks.set(userId, checkInterval);
  }

  stopStatusCheck(userId) {
    const interval = statusChecks.get(userId);
    if (interval) {
      clearInterval(interval);
      statusChecks.delete(userId);
    }
  }

  async checkStreamingStatus(userId) {
    const clients = this.activeStreams.get(userId);
    if (!clients || clients.size === 0) {
      return false;
    }

    let activeStreamCount = 0;
    for (const client of clients.values()) {
      try {
        if (client && client.user && client.ws.status === 0) {
          const activities = client.user.presence?.activities || [];
          const isStreaming = activities.some(
            (activity) => activity && activity.type === "STREAMING"
          );

          if (isStreaming) {
            activeStreamCount++;
          }
        }
      } catch (error) {
        console.error(`Error checking stream status for a client:`, error);
      }
    }

    return activeStreamCount > 0;
  }

  getActiveStreamsCount(userId) {
    const clients = this.activeStreams.get(userId);
    return clients ? clients.size : 0;
  }

  maskToken(token) {
    if (!token || typeof token !== "string") return "INVALID_TOKEN";
    const parts = token.split(".");
    if (parts.length < 2) return token.substring(0, 10) + "...";
    return `${parts[0]}.##########`;
  }
}

if (!global.gc) {
  console.warn(
    "Running without exposed garbage collection. Memory management will be limited."
  );
}

module.exports = new StreamManager();
