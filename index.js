const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  SeparatorBuilder,
  SectionBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  FileUploadBuilder,
  LabelBuilder,
} = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const streamManager = require("./utils/streamManager");
const TokenValidator = require("./utils/tokenValidator");
const activeStreamsManager = require("./database/activeStreams");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

let chalk;
try {
  chalk = require("chalk");
  if (typeof chalk.cyan !== "function") {
    chalk = {
      green: (text) => `\x1b[32m${text}\x1b[0m`,
      yellow: (text) => `\x1b[33m${text}\x1b[0m`,
      red: (text) => `\x1b[31m${text}\x1b[0m`,
      blue: (text) => `\x1b[34m${text}\x1b[0m`,
      magenta: (text) => `\x1b[35m${text}\x1b[0m`,
      cyan: (text) => `\x1b[36m${text}\x1b[0m`,
      white: (text) => `\x1b[37m${text}\x1b[0m`,
      gray: (text) => `\x1b[90m${text}\x1b[0m`,
      bold: (text) => `\x1b[1m${text}\x1b[0m`,
      dim: (text) => `\x1b[2m${text}\x1b[0m`,
      italic: (text) => `\x1b[3m${text}\x1b[0m`,
      underline: (text) => `\x1b[4m${text}\x1b[0m`,
      reset: (text) => `\x1b[0m${text}\x1b[0m`,
    };
  }
} catch (error) {
  chalk = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    white: (text) => `\x1b[37m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    dim: (text) => `\x1b[2m${text}\x1b[0m`,
    italic: (text) => `\x1b[3m${text}\x1b[0m`,
    underline: (text) => `\x1b[4m${text}\x1b[0m`,
    reset: (text) => `\x1b[0m${text}\x1b[0m`,
  };
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(
      chalk.yellow(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      )
    );
  }
}


const tempConfigs = new Map();

function createBanner(text, type = "info") {
  const width = 60;
  const padding = Math.floor((width - text.length) / 2);
  const line = "─".repeat(width);

  let color;
  switch (type) {
    case "success":
      color = chalk.green;
      break;
    case "error":
      color = chalk.red;
      break;
    case "warning":
      color = chalk.yellow;
      break;
    case "info":
    default:
      color = chalk.cyan;
  }

  return `\n${color("┌" + line + "┐")}\n${color("│")}${" ".repeat(
    padding
  )}${chalk.bold(text)}${" ".repeat(width - padding - text.length - 1)}${color(
    "│"
  )}\n${color("└" + line + "┘")}\n`;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
  sweepers: {
    messages: {
      interval: 120,
      lifetime: 60,
    },
  },
});

client.commands = new Collection();

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      chalk.yellow(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      )
    );
  }
}

client.once("ready", async () => {
  console.log(chalk.white("Logged in as:") + ` ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: "fucked",
        type: 1,
        url: "https://www.twitch.tv/4levy_z1",
      },
    ],
    status: "online",
    afk: false,
  });

  const activeUsers = activeStreamsManager.getActiveUsers();
  console.log(
    chalk.gray(`ℹ Found ${activeUsers.length} active user(s) to restore`)
  );

  let successCount = 0;
  let failCount = 0;

  for (const userId of activeUsers) {
    try {
      console.log(chalk.cyan(`⟳ Restoring stream for user ${userId}...`));

      const db = require("./database/db");
      const configManager = require("./database/userConfig");
      const userTokens = db.getUserTokens(userId);
      const userConfig = configManager.getUserConfig(userId);

      if (userTokens && userTokens.length > 0 && userConfig) {
        await streamManager.startStream(userId, userTokens, userConfig);
        streamManager.startStatusCheck(userId);
        console.log(chalk.green("✓ Successfully restored stream"));
        successCount++;
      } else {
        console.log(
          chalk.red("✗ Failed to restore stream: Missing tokens or config")
        );
        activeStreamsManager.removeUser(userId);
        failCount++;
      }
    } catch (error) {
      console.log(chalk.red(`✗ Failed to restore stream: ${error.message}`));
      activeStreamsManager.removeUser(userId);
      failCount++;
    }
  }

  try {
    console.log(chalk.cyan("Started refreshing application (/) commands."));
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log(chalk.green("✓ Commands registered successfully"));
  } catch (error) {
    console.log(chalk.red(`✗ Failed to register commands: ${error.message}`));
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error executing this command!",
      ephemeral: true,
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const handledButtons = [
    "streaming", "start_streaming", "stop_streaming", "config_streaming",
    "manual_config", "show_sample_config",
    "config_options", "config_rpc", "config_inputs",
    "rpc_basic", "rpc_content", "rpc_images", "rpc_buttons", "rpc_advanced",
    "settings", "add_token", "view_tokens", "remove_token"
  ];

  if (!handledButtons.includes(interaction.customId)) {
    return; 
  }

  if (interaction.customId === "streaming") {
    const isStreaming = await streamManager.isStreaming(interaction.user.id);

    const streamingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_streaming")
        .setLabel("Start")
        .setStyle(ButtonStyle.Success)
        .setDisabled(isStreaming),
      new ButtonBuilder()
        .setCustomId("stop_streaming")
        .setLabel("Stop")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!isStreaming),
      new ButtonBuilder()
        .setCustomId("config_streaming")
        .setLabel("Config")
        .setStyle(ButtonStyle.Primary)
    );

    const streamingContainer = new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("```Control your streaming status```")
      )
      .addActionRowComponents(streamingRow);

    await interaction.reply({
      components: [streamingContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  if (interaction.customId === "start_streaming") {
    try {
      await interaction.deferUpdate();

      const processingContainer = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("```⏳ Starting streaming status...```")
        );

      await interaction.editReply({
        components: [processingContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      const db = require("./database/db");
      const configManager = require("./database/userConfig");
      const userTokens = db.getUserTokens(interaction.user.id);
      const userConfig = configManager.getUserConfig(interaction.user.id);

      if (!userConfig) {
        const configErrorContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Configuration Missing")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("⚠️ You need to set up your configuration before starting the stream.")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("**How to Configure**\nClick the 'Config' button to set up your streaming configuration.")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# Configuration is required before streaming can start")
          );

        await interaction.editReply({
          components: [configErrorContainer, interaction.message.components[0]],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (
        !userConfig.OPTIONS ||
        !userConfig.RPC ||
        !userConfig.INPUTS
      ) {
        const invalidConfigContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Invalid Configuration")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("⚠️ Your configuration is incomplete or invalid.")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("**Missing Elements**\nYour config must include all required sections: OPTIONS, STATUS, RPC, and INPUTS.")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# Please update your configuration")
          );

        await interaction.editReply({
          components: [invalidConfigContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (!userTokens || userTokens.length === 0) {
        const tokenErrorContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("```⚠️ You need to add at least one token before starting the stream.```")
          );

        await interaction.editReply({
          components: [tokenErrorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      const result = await streamManager.startStream(
        interaction.user.id,
        userTokens,
        userConfig
      );

      if (result.success) {
        activeStreamsManager.addUser(interaction.user.id);

        const updatedRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("start_streaming")
            .setLabel("Start")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("stop_streaming")
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(false),
          new ButtonBuilder()
            .setCustomId("config_streaming")
            .setLabel("Config")
            .setStyle(ButtonStyle.Primary)
        );

        const startContainer = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("```Your streaming status is now active!```")
          );

        // Add status field
        startContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**Status**: Active")
        );

        // Add config field
        startContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Config**: ${userConfig._isDefault ? "Default (Template)" : "Custom"}`)
        );

        // Add active tokens field
        if (
          result.successCount !== undefined &&
          result.totalCount !== undefined
        ) {
          const tokenText = `${result.successCount}/${result.totalCount}` +
            (result.failedCount > 0 ? ` (${result.failedCount} failed)` : "");
          startContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Active Tokens**: ${tokenText}`)
          );

          if (result.failedCount > 0) {
            startContainer.addTextDisplayComponents(
              new TextDisplayBuilder().setContent("-# Some tokens failed to connect. Check the console for details.")
            );
          }
        } else {
          startContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Active Tokens**: ${userTokens.length}`)
          );
        }

        if (userConfig._isDefault) {
          startContainer.addSeparatorComponents(new SeparatorBuilder());
          startContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("⚠️ **Using Default Configuration**\n```You're currently using the default template config. For best results, upload your own custom configuration.```")
          );
        }

        await interaction.editReply({
          components: [startContainer, updatedRow],
          flags: MessageFlags.IsComponentsV2,
        });

        streamManager.startStatusCheck(interaction.user.id);
      } else {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Streaming Failed")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("❌ Failed to start streaming with any tokens.")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Reason**\n${result.error || "Tokens may be invalid or expired. Check the console for more details."}`)
          );

        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      console.error("Error starting stream:", error);

      await interaction.editReply({
        content: `❌ Error starting stream: ${error.message}`,
        components: [interaction.message.components[0]],
      });
    }
  }

  if (interaction.customId === "stop_streaming") {
    try {
      await interaction.deferUpdate();

      const success = await streamManager.stopStream(interaction.user.id);

      if (success) {
        activeStreamsManager.removeUser(interaction.user.id);
      }

      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("start_streaming")
          .setLabel("Start")
          .setStyle(ButtonStyle.Success)
          .setDisabled(false),
        new ButtonBuilder()
          .setCustomId("stop_streaming")
          .setLabel("Stop")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("config_streaming")
          .setLabel("Config")
          .setStyle(ButtonStyle.Primary)
      );

      const stopContainer = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            success
              ? "```Your streaming status has been deactivated.```"
              : "```No active streaming session found.```"
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Status**: ${success ? "Inactive" : "Already Inactive"}`
          )
        );

      await interaction.editReply({
        components: [stopContainer, updatedRow],
        flags: MessageFlags.IsComponentsV2,
      });

      streamManager.stopStatusCheck(interaction.user.id);
    } catch (error) {
      console.error("Error stopping stream:", error);
      await interaction.editReply({
        content: "❌ Error stopping the stream.",
        components: [interaction.message.components[0]],
      });
    }
  }

  if (interaction.customId === "config_streaming") {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const configRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("manual_config")
          .setLabel("Manual Configuration")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("show_sample_config")
          .setLabel("View Sample Config")
          .setStyle(ButtonStyle.Secondary)
      );

      const configContainer = new ContainerBuilder()
        .setAccentColor(0xf3eeee)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("```Choose how you want to configure your streaming status```")
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**1. Manual Configuration**\nConfigure your settings step by step using Discord buttons")
        )
        .addActionRowComponents(configRow);

      await interaction.editReply({
        components: [configContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error in config_streaming:", error.message);
    }
  }

  if (interaction.customId === "upload_config_modal") {
    console.log("upload_config_modal button clicked");
    try {
      const fileUpload = new FileUploadBuilder()
        .setCustomId("config_file_upload")
        .setRequired(true);

      const modal = new ModalBuilder()
        .setCustomId("upload_config_file_modal")
        .setTitle("Upload Configuration")
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Configuration File")
            .setDescription("Please upload your config.yml or config.yaml file")
            .setFileUploadComponent(fileUpload)
        );

      await interaction.showModal(modal);
      return;
    } catch (error) {
      console.error("Error showing upload config modal:", error);

      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("❌ Error showing upload modal: " + error.message)
        );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
      return;
    }
  }

  if (interaction.customId === "manual_config") {
    const manualConfigContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("📝 **Manual Configuration**")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("```Configure your bot step by step```\n\nChoose a section to configure:")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**OPTIONS** - Location and Timezone settings")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**RPC** - Rich Presence configuration")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**INPUTS** - Activity type selection")
      );

    const configRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("config_options")
        .setLabel("OPTIONS")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("config_rpc")
        .setLabel("RPC")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("config_inputs")
        .setLabel("INPUTS")
        .setStyle(ButtonStyle.Primary),
    );

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("config_preview")
        .setLabel("Preview Config")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("config_save")
        .setLabel("Save & Apply")
        .setStyle(ButtonStyle.Success),
    );

    await interaction.reply({
      components: [manualConfigContainer, configRow, actionRow],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  if (interaction.customId === "config_options") {
    const modal = new ModalBuilder()
      .setCustomId("modal_options")
      .setTitle("OPTIONS Configuration");

    const locationInput = new TextInputBuilder()
      .setCustomId("option_location")
      .setLabel("Location (City/Country)")
      .setPlaceholder("Bangkok, New York, Tokyo, etc.")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue("Bangkok");

    const timezoneInput = new TextInputBuilder()
      .setCustomId("option_tz")
      .setLabel("Timezone")
      .setPlaceholder("Asia/Bangkok, America/New_York, etc.")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue("Asia/Bangkok");

    modal.addComponents(
      new ActionRowBuilder().addComponents(locationInput),
      new ActionRowBuilder().addComponents(timezoneInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "config_rpc") {
    const rpcContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## RPC Configuration")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("```Configure your Rich Presence step by step```")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Basic** - Delay, URLs")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Content** - Details, State, Name")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Images** - Large/Small images and text")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Buttons** - Up to 2 buttons")
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Advanced** - Timestamps")
      );

    const rpcRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpc_basic")
        .setLabel("Basic")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("rpc_content")
        .setLabel("Content")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("rpc_images")
        .setLabel("Images")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("rpc_buttons")
        .setLabel("Buttons")
        .setStyle(ButtonStyle.Primary)
    );

    const rpcRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rpc_advanced")
        .setLabel("Advanced (Timestamps)")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("manual_config")
        .setLabel("« Back")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      components: [rpcContainer, rpcRow, rpcRow2],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  if (interaction.customId === "config_inputs") {
    const modal = new ModalBuilder()
      .setCustomId("modal_inputs")
      .setTitle("INPUTS Configuration");

    const activityInput = new TextInputBuilder()
      .setCustomId("input_activity_type")
      .setLabel("Activity Type")
      .setPlaceholder("STREAMING, LISTENING, PLAYING, WATCHING, COMPETING")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue("STREAMING");

    modal.addComponents(
      new ActionRowBuilder().addComponents(activityInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "rpc_basic") {
    const modal = new ModalBuilder()
      .setCustomId("modal_rpc_basic")
      .setTitle("RPC - Basic Settings");

    const delayInput = new TextInputBuilder()
      .setCustomId("rpc_delay")
      .setLabel("RPC Update Delay (milliseconds)")
      .setPlaceholder("4000")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue("4000");

    const twitchInput = new TextInputBuilder()
      .setCustomId("rpc_twitch_url")
      .setLabel("Twitch URL (or 'none')")
      .setPlaceholder("https://www.twitch.tv/yourname")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const youtubeInput = new TextInputBuilder()
      .setCustomId("rpc_youtube_url")
      .setLabel("YouTube URL (or 'none')")
      .setPlaceholder("https://www.youtube.com/@yourname")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(delayInput),
      new ActionRowBuilder().addComponents(twitchInput),
      new ActionRowBuilder().addComponents(youtubeInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "rpc_content") {
    const modal = new ModalBuilder()
      .setCustomId("modal_rpc_content")
      .setTitle("RPC - Content");

    const detailsInput = new TextInputBuilder()
      .setCustomId("rpc_details")
      .setLabel("Details (one per line for rotation)")
      .setPlaceholder("Line 1\nLine 2\nLine 3")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setValue("Your details here");

    const stateInput = new TextInputBuilder()
      .setCustomId("rpc_state")
      .setLabel("State (one per line for rotation)")
      .setPlaceholder("State 1\nState 2")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(detailsInput),
      new ActionRowBuilder().addComponents(stateInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "rpc_images") {
    const modal = new ModalBuilder()
      .setCustomId("modal_rpc_images")
      .setTitle("RPC - Images");

    const largeImageInput = new TextInputBuilder()
      .setCustomId("rpc_large_image")
      .setLabel("Large Image URL (or 'none')")
      .setPlaceholder("https://example.com/image.png")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const largeTextInput = new TextInputBuilder()
      .setCustomId("rpc_large_text")
      .setLabel("Large Image Hover Text")
      .setPlaceholder("Text shown on hover")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const smallImageInput = new TextInputBuilder()
      .setCustomId("rpc_small_image")
      .setLabel("Small Image URL (or 'none')")
      .setPlaceholder("https://example.com/small.png")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const smallTextInput = new TextInputBuilder()
      .setCustomId("rpc_small_text")
      .setLabel("Small Image Hover Text")
      .setPlaceholder("Text shown on hover")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(largeImageInput),
      new ActionRowBuilder().addComponents(largeTextInput),
      new ActionRowBuilder().addComponents(smallImageInput),
      new ActionRowBuilder().addComponents(smallTextInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "rpc_buttons") {
    const modal = new ModalBuilder()
      .setCustomId("modal_rpc_buttons")
      .setTitle("RPC - Buttons");

    const button1LabelInput = new TextInputBuilder()
      .setCustomId("rpc_button1_label")
      .setLabel("Button 1 Label")
      .setPlaceholder("Visit Website")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const button1UrlInput = new TextInputBuilder()
      .setCustomId("rpc_button1_url")
      .setLabel("Button 1 URL")
      .setPlaceholder("https://example.com")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const button2LabelInput = new TextInputBuilder()
      .setCustomId("rpc_button2_label")
      .setLabel("Button 2 Label (optional)")
      .setPlaceholder("Join Discord")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const button2UrlInput = new TextInputBuilder()
      .setCustomId("rpc_button2_url")
      .setLabel("Button 2 URL (optional)")
      .setPlaceholder("https://discord.gg/...")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(button1LabelInput),
      new ActionRowBuilder().addComponents(button1UrlInput),
      new ActionRowBuilder().addComponents(button2LabelInput),
      new ActionRowBuilder().addComponents(button2UrlInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "rpc_advanced") {
    const modal = new ModalBuilder()
      .setCustomId("modal_rpc_advanced")
      .setTitle("RPC - Advanced (Timestamps)");

    const startTimeInput = new TextInputBuilder()
      .setCustomId("rpc_timestamp_start")
      .setLabel("Start Timestamp (ISO format or 'none')")
      .setPlaceholder("2025-01-01T00:00:00.000Z or 'none'")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const endTimeInput = new TextInputBuilder()
      .setCustomId("rpc_timestamp_end")
      .setLabel("End Timestamp (ISO format or 'none')")
      .setPlaceholder("2030-12-31T23:59:59.000Z or 'none'")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(startTimeInput),
      new ActionRowBuilder().addComponents(endTimeInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "settings") {
    const db = require("./database/db");
    const userTokens = db.getUserTokens(interaction.user.id);
    const hasTokens = userTokens && userTokens.length > 0;

    const settingsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("add_token")
        .setLabel("Add Token")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("view_tokens")
        .setLabel("View My Tokens")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasTokens),
      new ButtonBuilder()
        .setCustomId("remove_token")
        .setLabel("Remove Token")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!hasTokens)
    );

    const settingsContainer = new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("```Configure your status settings here```")
      )
      .addActionRowComponents(settingsRow);

    let isMainMenu = false;
    if (interaction.isMessageComponent() && interaction.message && interaction.message.components && interaction.message.components.length > 0) {
      isMainMenu = true;
    }
    if (interaction.isMessageComponent() && interaction.message && !isMainMenu) {
      await interaction.update({
        components: [settingsContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      await interaction.reply({
        components: [settingsContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }
  }

  if (interaction.customId === "add_token") {
    const modal = new ModalBuilder()
      .setCustomId("token_modal")
      .setTitle("Add tokens");

    const tokenValueInput = new TextInputBuilder()
      .setCustomId("token_value")
      .setLabel("tokens value")
      .setPlaceholder(
        "ป้อนโทเค็นหนึ่งรายการหรือมากกว่า คั่นด้วยเครื่องหมายจุลภาค (,)"
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(tokenValueInput);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);
  }

  if (interaction.customId === "view_tokens") {
    try {
      if (!interaction.isRepliable()) {
        console.log("Interaction is no longer valid");
        return;
      }

      const db = require("./database/db");
      const userData = db.data.users[interaction.user.id];

      if (!userData || userData.tokens.length === 0) {
        const noTokensContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("```You don't have any saved tokens yet.```")
          );

        await interaction
          .reply({
            components: [noTokensContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          })
          .catch((error) => {
            console.error("Error replying to interaction:", error);
          });
        return;
      }

      const tokenList = userData.tokens
        .map((t, index) => {
          const username = t.username || "Unknown User";
          const status =
            t.fetchSuccess === false ? " (Token may be invalid)" : "";
          return `**${index + 1}.** \`${username}\`${status} (Added: ${new Date(
            t.addedAt
          ).toLocaleString()})`;
        })
        .join("\n");

      const tokensContainer = new ContainerBuilder()
        .setAccentColor(0xfcf7f7)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${interaction.user.username} db`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(tokenList)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Total tokens: ${userData.tokens.length}`)
        );

      await interaction
        .reply({
          components: [tokensContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        })
        .catch((error) => {
          console.error("Error replying to interaction:", error);
        });
    } catch (error) {
      console.error("Error handling interaction:", error);
    }
  }

  if (interaction.customId === "remove_token") {
    try {
      const db = require("./database/db");
      const tokens = db.getUserTokens(interaction.user.id);

      if (!tokens || tokens.length === 0) {
        const noTokensContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("```You don't have any saved tokens to remove.```")
          );

        await interaction.reply({
          components: [noTokensContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      const options = tokens.map((token, index) => ({
        label: token.username || `Token ${index + 1}`,
        description: `Added: ${new Date(token.addedAt).toLocaleDateString()}`,
        value: token.value,
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_token_to_remove")
        .setPlaceholder("Select a token to remove")
        .addOptions(options);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const removeTokenContainer = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addActionRowComponents(selectRow);

      await interaction.reply({
        components: [removeTokenContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in remove token button:", error);
      await interaction.reply({
        content: "An error occurred while preparing the token removal menu.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (interaction.customId === "show_sample_config") {
    try {
      const sampleConfigPath = path.join(
        __dirname,
        "config-templates",
        "sample-config.txt"
      );
      let formattedConfig;

      if (fs.existsSync(sampleConfigPath)) {
        formattedConfig = fs.readFileSync(sampleConfigPath, "utf8");
      } else {
        const configManager = require("./database/userConfig");
        const sampleConfig = configManager.getDefaultConfig();
        formattedConfig = JSON.stringify(sampleConfig, null, 2);

        try {
          const dirPath = path.join(__dirname, "config-templates");
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }

          fs.writeFileSync(sampleConfigPath, formattedConfig);
          console.log("Created sample config file at:", sampleConfigPath);
        } catch (err) {
          console.error("Error creating sample config file:", err);
        }
      }

      const sampleConfigContainer = new ContainerBuilder()
        .setAccentColor(0xf0e9e9)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("```Copy this configuration and modify it for your needs:```")
        );

      if (formattedConfig.length > 1000) {
        sampleConfigContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**Configuration Format (Part 1)**\n```yml\n" + formattedConfig.slice(0, 1000) + "\n...```")
        );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("download_config")
            .setLabel("Download Full Config")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          components: [sampleConfigContainer, row],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      } else {
        sampleConfigContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**Configuration Format**\n```json\n" + formattedConfig + "```")
        );

        await interaction.reply({
          components: [sampleConfigContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error("Error showing sample config:", error);
      await interaction.reply({
        content: "❌ An error occurred while loading the sample configuration.",
        ephemeral: true,
      });
    }
  }

  if (interaction.customId === "download_config") {
    try {
      const sampleConfigPath = path.join(
        __dirname,
        "config-templates",
        "sample-config.txt"
      );
      const formattedConfig = fs.readFileSync(sampleConfigPath, "utf8");

      const tempFilePath = path.join(
        __dirname,
        "config-templates",
        "temp-config.json"
      );
      fs.writeFileSync(tempFilePath, formattedConfig);

      await interaction.reply({
        files: [
          {
            attachment: tempFilePath,
            name: "sample-config.json",
            description: "Sample streaming status configuration",
          },
        ],
        ephemeral: true,
      });

      fs.unlinkSync(tempFilePath);
    } catch (error) {
      console.error("Error downloading config:", error);
      await interaction.reply({
        content: "❌ An error occurred while downloading the configuration.",
        ephemeral: true,
      });
    }
  }

  if (interaction.customId === "config_basic") {
    const configManager = require("./database/userConfig");
    const userConfig = configManager.getUserConfig(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId("basic_settings_modal")
      .setTitle("Basic Settings");

    const cityInput = new TextInputBuilder()
      .setCustomId("city")
      .setLabel("City")
      .setPlaceholder("Enter your city (e.g., pattaya)")
      .setStyle(TextInputStyle.Short)
      .setValue(userConfig.setup?.city || "pattaya")
      .setRequired(true);

    const delayInput = new TextInputBuilder()
      .setCustomId("delay")
      .setLabel("Delay (seconds)")
      .setPlaceholder("Enter delay in seconds (e.g., 10)")
      .setStyle(TextInputStyle.Short)
      .setValue(String(userConfig.setup?.delay || 10))
      .setRequired(true);

    const cityRow = new ActionRowBuilder().addComponents(cityInput);
    const delayRow = new ActionRowBuilder().addComponents(delayInput);

    modal.addComponents(cityRow, delayRow);

    await interaction.showModal(modal);
  }

  if (interaction.customId === "config_urls") {
    const configManager = require("./database/userConfig");
    const userConfig = configManager.getUserConfig(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId("urls_modal")
      .setTitle("Watch URLs");

    const urlsInput = new TextInputBuilder()
      .setCustomId("urls")
      .setLabel("Watch URLs (one per line)")
      .setPlaceholder(
        "Enter URLs to watch (e.g., https://www.twitch.tv/username)"
      )
      .setStyle(TextInputStyle.Paragraph)
      .setValue(userConfig.config?.options?.["watch-url"]?.join("\n") || "")
      .setRequired(true);

    const urlsRow = new ActionRowBuilder().addComponents(urlsInput);

    modal.addComponents(urlsRow);

    await interaction.showModal(modal);
  }

  if (interaction.customId === "config_messages") {
    const configManager = require("./database/userConfig");
    const userConfig = configManager.getUserConfig(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId("messages_modal")
      .setTitle("Status Messages");

    const text1Input = new TextInputBuilder()
      .setCustomId("text1")
      .setLabel("Text 1 (one per line)")
      .setPlaceholder(
        "Enter time format text (e.g., {NF3( 〈 {emoji:time} {hour:1} : {min:1} 〉)}"
      )
      .setStyle(TextInputStyle.Paragraph)
      .setValue(userConfig.config?.["text-1"]?.join("\n") || "")
      .setRequired(false);

    const text2Input = new TextInputBuilder()
      .setCustomId("text2")
      .setLabel("Text 2 (one per line)")
      .setPlaceholder("Enter status messages (e.g., {NF3(Your Status Here)})")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(userConfig.config?.["text-2"]?.join("\n") || "")
      .setRequired(false);

    const text3Input = new TextInputBuilder()
      .setCustomId("text3")
      .setLabel("Text 3 (one per line)")
      .setPlaceholder("Enter decorative text (e.g., ☆★✮⋆☆★✮⋆)")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(userConfig.config?.["text-3"]?.join("\n") || "")
      .setRequired(false);

    const text1Row = new ActionRowBuilder().addComponents(text1Input);
    const text2Row = new ActionRowBuilder().addComponents(text2Input);
    const text3Row = new ActionRowBuilder().addComponents(text3Input);

    modal.addComponents(text1Row, text2Row, text3Row);

    await interaction.showModal(modal);
  }

  if (interaction.customId === "config_images") {
    const configManager = require("./database/userConfig");
    const userConfig = configManager.getUserConfig(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId("images_modal")
      .setTitle("Images");

    const bigImgInput = new TextInputBuilder()
      .setCustomId("bigimg")
      .setLabel("Large Images (one URL per line)")
      .setPlaceholder("Enter URLs for large images")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(userConfig.config?.bigimg?.join("\n") || "")
      .setRequired(false);

    const smallImgInput = new TextInputBuilder()
      .setCustomId("smallimg")
      .setLabel("Small Images (one URL per line)")
      .setPlaceholder("Enter URLs for small images")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(userConfig.config?.smallimg?.join("\n") || "")
      .setRequired(false);

    const bigImgRow = new ActionRowBuilder().addComponents(bigImgInput);
    const smallImgRow = new ActionRowBuilder().addComponents(smallImgInput);

    modal.addComponents(bigImgRow, smallImgRow);

    await interaction.showModal(modal);
  }

  if (interaction.customId === "config_buttons") {
    const configManager = require("./database/userConfig");
    const userConfig = configManager.getUserConfig(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId("buttons_modal")
      .setTitle("Buttons");

    const button1NameInput = new TextInputBuilder()
      .setCustomId("button1_name")
      .setLabel("Button 1 Name")
      .setPlaceholder("Enter name for the first button")
      .setStyle(TextInputStyle.Short)
      .setValue(userConfig.config?.["button-1"]?.[0]?.name || "")
      .setRequired(false);

    const button1UrlInput = new TextInputBuilder()
      .setCustomId("button1_url")
      .setLabel("Button 1 URL")
      .setPlaceholder("Enter URL for the first button")
      .setStyle(TextInputStyle.Short)
      .setValue(userConfig.config?.["button-1"]?.[0]?.url || "")
      .setRequired(false);

    const button2NameInput = new TextInputBuilder()
      .setCustomId("button2_name")
      .setLabel("Button 2 Name")
      .setPlaceholder("Enter name for the second button")
      .setStyle(TextInputStyle.Short)
      .setValue(userConfig.config?.["button-2"]?.[0]?.name || "")
      .setRequired(false);

    const button2UrlInput = new TextInputBuilder()
      .setCustomId("button2_url")
      .setLabel("Button 2 URL")
      .setPlaceholder("Enter URL for the second button")
      .setStyle(TextInputStyle.Short)
      .setValue(userConfig.config?.["button-2"]?.[0]?.url || "")
      .setRequired(false);

    const button1NameRow = new ActionRowBuilder().addComponents(
      button1NameInput
    );
    const button1UrlRow = new ActionRowBuilder().addComponents(button1UrlInput);
    const button2NameRow = new ActionRowBuilder().addComponents(
      button2NameInput
    );
    const button2UrlRow = new ActionRowBuilder().addComponents(button2UrlInput);

    modal.addComponents(
      button1NameRow,
      button1UrlRow,
      button2NameRow,
      button2UrlRow
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "save_config") {
    const configManager = require("./database/userConfig");
    const userConfig = configManager.getUserConfig(interaction.user.id);

    const tempConfig = {
      setup: {
        city: userConfig.setup?.city || "pattaya",
        delay: userConfig.setup?.delay || 10,
      },
      config: {
        options: {
          "watch-url": userConfig.config?.options?.["watch-url"] || [],
          timestamp: userConfig.config?.options?.timestamp || "{start}",
        },
        "text-1": userConfig.config?.["text-1"] || [],
        "text-2": userConfig.config?.["text-2"] || [],
        "text-3": userConfig.config?.["text-3"] || [],
        bigimg: userConfig.config?.bigimg || [],
        smallimg: userConfig.config?.smallimg || [],
        "button-1": userConfig.config?.["button-1"] || [],
        "button-2": userConfig.config?.["button-2"] || [],
      },
    };

    const success = configManager.setUserConfig(
      interaction.user.id,
      tempConfig
    );

    if (success) {
      const saveConfigContainer = new ContainerBuilder()
        .setAccentColor(0xf1efef)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("```Your streaming configuration has been saved successfully!```")
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**City**: ${tempConfig.setup.city}`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Delay**: ${tempConfig.setup.delay}s`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Watch URLs**\n${tempConfig.config.options["watch-url"].length > 0 ? tempConfig.config.options["watch-url"].join("\n") : "None set"}`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Status Messages**: ${tempConfig.config["text-2"].length > 0 ? `${tempConfig.config["text-2"].length} messages set` : "None set"}`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Images**: ${tempConfig.config.bigimg.length > 0 ? `${tempConfig.config.bigimg.length} images set` : "None set"}`)
        );

      await interaction.reply({
        components: [saveConfigContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "❌ Failed to save configuration. Please try again.",
        ephemeral: true,
      });
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== "next_image") return;

  try {
    const configManager = require("./database/userConfig");
    const userConfig = configManager.getUserConfig(interaction.user.id);
    const images = userConfig.config?.bigimg || [];

    if (images.length <= 1) return;

    const currentEmbed = interaction.message.embeds[0];
    const currentImage = currentEmbed.image?.url;
    let currentIndex = images.findIndex((img) => img === currentImage);
    let nextIndex = (currentIndex + 1) % images.length;

    const currentComponents = interaction.message.components;
    const newContainer = new ContainerBuilder()
      .setAccentColor(0xfffdfd)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems({
          media: { url: images[nextIndex] }
        })
      );

    await interaction.update({
      components: [newContainer, ...currentComponents.slice(1)],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error("Error updating image:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === "upload_config_file_modal") {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      console.log("Modal submission data:");
      console.log("- Has attachments:", !!interaction.attachments);
      console.log("- Fields available:", interaction.fields?.fields?.size || 0);
      let fileAttachment = null;

      if (interaction.attachments && interaction.attachments.size > 0) {
        fileAttachment = interaction.attachments.first();
        console.log("Got file from interaction.attachments");
      }

      if (!fileAttachment && interaction.fields) {
        try {
          const fileField = interaction.fields.getField("config_file_upload");
          console.log("File field keys:", fileField ? Object.keys(fileField) : "null");
          console.log("Attachments:", fileField?.attachments);
          console.log("Attachments type:", typeof fileField?.attachments);

          if (fileField && fileField.attachments) {
            if (typeof fileField.attachments.first === 'function') {
              fileAttachment = fileField.attachments.first();
              console.log("Got file from fileField.attachments.first()");
            } else if (Array.isArray(fileField.attachments) && fileField.attachments.length > 0) {
              fileAttachment = fileField.attachments[0];
              console.log("Got file from fileField.attachments[0]");
            } else if (fileField.attachments instanceof Map && fileField.attachments.size > 0) {
              fileAttachment = fileField.attachments.values().next().value;
              console.log("Got file from fileField.attachments Map");
            } else if (typeof fileField.attachments === 'object') {
              const values = Object.values(fileField.attachments);
              if (values.length > 0) {
                fileAttachment = values[0];
                console.log("Got file from Object.values(fileField.attachments)[0]");
              }
            }
          }

          if (!fileAttachment && fileField) {
            console.log("Full fileField stringified:", JSON.stringify(fileField, null, 2));
          }
        } catch (e) {
          console.log("Could not get field:", e.message);
        }
      }

      if (!fileAttachment && interaction.fields?.fields) {
        for (const [key, field] of interaction.fields.fields) {
          console.log(`Field ${key}:`, field);
          if (field.attachment) {
            fileAttachment = field.attachment;
            console.log("Got file from field iteration");
            break;
          }
        }
      }

      if (!fileAttachment) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("❌ No file was uploaded. Please try again.")
          );

        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      const filename = fileAttachment.filename || fileAttachment.name || "";
      const fileUrl = fileAttachment.url || fileAttachment.attachment;

      if (!filename.endsWith(".yml") && !filename.endsWith(".yaml")) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("❌ Please upload a .yml or .yaml file")
          );

        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const configText = await response.text();
      const YmlValidator = require("./utils/ymlValidator");
      const configManager = require("./database/userConfig");

      const validationResult = YmlValidator.validateConfig(configText);

      if (!validationResult.isValid) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Configuration Error")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("```" + validationResult.error + "```")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "**How to Fix**\n" +
              "Make sure your configuration file:\n" +
              "• Is valid YAML format\n" +
              "• Has all required sections (STATUS, RPC, INPUTS)\n" +
              "• Contains valid values and delays ≥ 4000ms"
            )
          );

        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      const config = validationResult.config;
      const success = configManager.setUserConfig(interaction.user.id, config);

      if (success) {
        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setURL(
              config.RPC?.buttonFirst?.[0]?.url || "https://server.0nyx.wtf/"
            )
            .setLabel(
              config.RPC?.buttonFirst?.[0]?.label || "Miyako's server"
            )
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setURL(
              config.RPC?.buttonSecond?.[0]?.url || "https://github.com/umrfyn/Streaming-status"
            )
            .setLabel(
              config.RPC?.buttonSecond?.[0]?.label || "Stream status > Deobf"
            )
            .setStyle(ButtonStyle.Link)
        );

        const imageRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("next_image")
            .setLabel("Next Image")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!(config.RPC?.assetsLargeImage?.length > 1))
        );

        const successContainer = new ContainerBuilder()
          .setAccentColor(0x3498db)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Configuration Uploaded Successfully")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Your YML configuration has been loaded successfully.")
          );

        const images = config.RPC?.assetsLargeImage || [];
        if (images.length > 0) {
          successContainer.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems({
              media: { url: images[0] }
            })
          );
        }

        successContainer.addActionRowComponents(buttonRow);
        successContainer.addActionRowComponents(imageRow);

        await interaction.editReply({
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        const failContainer = new ContainerBuilder()
          .setAccentColor(0xe74c3c)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("❌ Failed to save configuration. Please try again.")
          );

        await interaction.editReply({
          components: [failContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      console.error("Error processing config file:", error);

      const errorMessage = error.message.includes("heap")
        ? "Configuration file is too large."
        : "Error processing the configuration file: " + error.message;

      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("❌ " + errorMessage)
        );

      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }

  if (interaction.customId === "token_modal") {
    const tokenInput = interaction.fields
      .getTextInputValue("token_value")
      .trim();
    const tokens = tokenInput
      .split(",")
      .map((token) => token.trim())
      .filter((token) => token);

    if (tokens.length === 0) {
      await interaction.reply({
        content: "❌ No valid tokens provided.",
        ephemeral: true,
      });
      return;
    }

    try {
      
      const loadingContainer = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("```⏳ Validating and adding your token(s)...```\nThis may take a few seconds.")
        );
      await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      const db = require("./database/db");

      let validCount = 0;
      let invalidCount = 0;
      let duplicateCount = 0;

      const existingTokens = db.getUserTokens(interaction.user.id);
      const existingValues = existingTokens.map((token) => token.value);

      for (const token of tokens) {
        try {
          if (existingValues.includes(token)) {
            duplicateCount++;
            continue;
          }

          const isValid = await validateSelfbotToken(token);

          if (isValid) {
            const success = await db.setUserToken(interaction.user.id, token);

            if (success) {
              validCount++;
              existingValues.push(token);
            } else {
              invalidCount++;
              console.log(`Failed to save valid token to database`);
            }
          } else {
            invalidCount++;
          }
        } catch (err) {
          console.error(`Error processing token: ${err}`);
          invalidCount++;
        }
      }

      const resultsContainer = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Processed ${tokens.length} token(s)`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Successfully Added**: ${validCount} token(s)`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`❌ **Failed**: ${invalidCount} token(s)`)
        );

      if (duplicateCount > 0) {
        resultsContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`⚠️ **Duplicates Skipped**: ${duplicateCount} token(s)`)
        );
      }

      if (validCount > 0) {
        resultsContainer.addSeparatorComponents(new SeparatorBuilder());
        resultsContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**Next Steps**\n```You can now use these tokens to start your streaming status.```")
        );
      }

      if (invalidCount > 0) {
        resultsContainer.addSeparatorComponents(new SeparatorBuilder());
        resultsContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("**Invalid Tokens**\nSome tokens couldn't be validated. Make sure they are:\n• Valid user tokens (not bot tokens)\n• Not expired\n• Properly formatted")
        );
      }

      await interaction.editReply({
        components: [resultsContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      setTimeout(async () => {
        try {
          const updatedTokens = db.getUserTokens(interaction.user.id);
          const hasTokensNow = updatedTokens && updatedTokens.length > 0;
          const settingsContainer = new ContainerBuilder()
            .setAccentColor(0xffffff)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("```Configure your status settings here```")
            );
          const settingsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("add_token")
              .setLabel("Add Token")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("view_tokens")
              .setLabel("View My Tokens")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(!hasTokensNow),
            new ButtonBuilder()
              .setCustomId("remove_token")
              .setLabel("Remove Token")
              .setStyle(ButtonStyle.Danger)
              .setDisabled(!hasTokensNow)
          );
          await interaction.editReply({
            components: [settingsContainer, settingsRow],
            flags: MessageFlags.IsComponentsV2,
          });
        } catch (e) {
        }
      }, 2000);
    } catch (error) {
      console.error("Error in token validation:", error);

      let errorMessage = "❌ Error processing tokens. ";
      if (error.message.includes("JSON")) {
        errorMessage += "Invalid token format detected.";
      } else {
        errorMessage += "Please try again later.";
      }
      try {
        await interaction.editReply({
          content: errorMessage,
          ephemeral: true,
        });
      } catch {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      }
    }
  }

  if (interaction.customId === "streaming_config_modal") {
    try {
      const configJson = interaction.fields.getTextInputValue("config_json");
      const configData = JSON.parse(configJson);
      const configManager = require("./database/userConfig");

      const success = configManager.setUserConfig(
        interaction.user.id,
        configData
      );

      if (success) {
        const streamingConfigContainer = new ContainerBuilder()
          .setAccentColor(0x3498db)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Streaming Configuration Updated")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Your streaming configuration has been saved!")
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**City**: ${configData.setup?.city || "Not set"}`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Delay**: ${configData.setup?.delay || 0}s`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Status Count**: ${configData.config?.["text-2"]?.length || 0} status messages`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Image Count**: ${configData.config?.bigimg?.length || 0} images`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Watch URLs**\n${configData.config?.options?.["watch-url"]?.join("\n") || "None set"}`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# Use the streaming panel to start/stop streaming")
          );

        await interaction.reply({
          components: [streamingConfigContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "❌ Failed to save configuration. Please try again.",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error saving config:", error);
      await interaction.reply({
        content:
          "❌ Invalid JSON format. Please check your configuration and try again.",
        ephemeral: true,
      });
    }
  }

  if (interaction.customId === "basic_settings_modal") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const city = interaction.fields.getTextInputValue("city").trim();
      const delay =
        parseInt(interaction.fields.getTextInputValue("delay").trim()) || 10;

      const configManager = require("./database/userConfig");
      const userConfig = configManager.getUserConfig(interaction.user.id);

      if (!userConfig.setup) userConfig.setup = {};
      userConfig.setup.city = city;
      userConfig.setup.delay = delay;

      const success = configManager.setUserConfig(
        interaction.user.id,
        userConfig
      );

      if (success) {
        await interaction.editReply({
          content: "✅ Basic settings updated successfully!",
        });
      } else {
        await interaction.editReply({
          content: "❌ Failed to update basic settings. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating basic settings:", error);
      await interaction.editReply({
        content: "❌ An error occurred while updating basic settings.",
      });
    }
  }

  if (interaction.customId === "urls_modal") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const urlsText = interaction.fields.getTextInputValue("urls").trim();
      const urls = urlsText
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url);

      const configManager = require("./database/userConfig");
      const userConfig = configManager.getUserConfig(interaction.user.id);

      if (!userConfig.config) userConfig.config = {};
      if (!userConfig.config.options) userConfig.config.options = {};
      userConfig.config.options["watch-url"] = urls;

      const success = configManager.setUserConfig(
        interaction.user.id,
        userConfig
      );

      if (success) {
        await interaction.editReply({
          content: `✅ Watch URLs updated successfully! ${urls.length} URL(s) set.`,
        });
      } else {
        await interaction.editReply({
          content: "❌ Failed to update watch URLs. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating watch URLs:", error);
      await interaction.editReply({
        content: "❌ An error occurred while updating watch URLs.",
      });
    }
  }

  if (interaction.customId === "messages_modal") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const text1 = interaction.fields
        .getTextInputValue("text1")
        .trim()
        .split("\n")
        .filter((text) => text);
      const text2 = interaction.fields
        .getTextInputValue("text2")
        .trim()
        .split("\n")
        .filter((text) => text);
      const text3 = interaction.fields
        .getTextInputValue("text3")
        .trim()
        .split("\n")
        .filter((text) => text);

      const configManager = require("./database/userConfig");
      const userConfig = configManager.getUserConfig(interaction.user.id);

      if (!userConfig.config) userConfig.config = {};
      userConfig.config["text-1"] = text1;
      userConfig.config["text-2"] = text2;
      userConfig.config["text-3"] = text3;

      const success = configManager.setUserConfig(
        interaction.user.id,
        userConfig
      );

      if (success) {
        await interaction.editReply({
          content: "✅ Status messages updated successfully!",
        });
      } else {
        await interaction.editReply({
          content: "❌ Failed to update status messages. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating status messages:", error);
      await interaction.editReply({
        content: "❌ An error occurred while updating status messages.",
      });
    }
  }

  if (interaction.customId === "images_modal") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const bigimg = interaction.fields
        .getTextInputValue("bigimg")
        .trim()
        .split("\n")
        .filter((url) => url);
      const smallimg = interaction.fields
        .getTextInputValue("smallimg")
        .trim()
        .split("\n")
        .filter((url) => url);

      const configManager = require("./database/userConfig");
      const userConfig = configManager.getUserConfig(interaction.user.id);

      if (!userConfig.config) userConfig.config = {};
      userConfig.config.bigimg = bigimg;
      userConfig.config.smallimg = smallimg;

      const success = configManager.setUserConfig(
        interaction.user.id,
        userConfig
      );

      if (success) {
        await interaction.editReply({
          content: `✅ Images updated successfully! ${bigimg.length} large image(s) and ${smallimg.length} small image(s) set.`,
        });
      } else {
        await interaction.editReply({
          content: "❌ Failed to update images. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating images:", error);
      await interaction.editReply({
        content: "❌ An error occurred while updating images.",
      });
    }
  }

  if (interaction.customId === "buttons_modal") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const button1Name = interaction.fields
        .getTextInputValue("button1_name")
        .trim();
      const button1Url = interaction.fields
        .getTextInputValue("button1_url")
        .trim();
      const button2Name = interaction.fields
        .getTextInputValue("button2_name")
        .trim();
      const button2Url = interaction.fields
        .getTextInputValue("button2_url")
        .trim();

      const configManager = require("./database/userConfig");
      const userConfig = configManager.getUserConfig(interaction.user.id);

      
      if (!userConfig.config) userConfig.config = {};

     
      if (button1Name && button1Url) {
        userConfig.config["button-1"] = [
          {
            name: button1Name,
            url: button1Url,
          },
        ];
      } else {
        userConfig.config["button-1"] = [];
      }

      
      if (button2Name && button2Url) {
        userConfig.config["button-2"] = [
          {
            name: button2Name,
            url: button2Url,
          },
        ];
      } else {
        userConfig.config["button-2"] = [];
      }

      
      const success = configManager.setUserConfig(
        interaction.user.id,
        userConfig
      );

      if (success) {
        await interaction.editReply({
          content: "✅ Buttons updated successfully!",
        });
      } else {
        await interaction.editReply({
          content: "❌ Failed to update buttons. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating buttons:", error);
      await interaction.editReply({
        content: "❌ An error occurred while updating buttons.",
      });
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "select_token_to_remove") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const tokenValue = interaction.values[0];
      const db = require("./database/db");

      const success = db.removeUserToken(interaction.user.id, tokenValue);

      if (success) {
        await interaction.editReply({
          content: "``✅`` **Token successfully removed!**",
        });
      } else {
        await interaction.editReply({
          content: "❌ Failed to remove token. Please try again.",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error in select menu handler:", error);
      await interaction.editReply({
        content: "An error occurred while removing the token.",
        ephemeral: true,
      });
    }
  }
});


client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const userId = interaction.user.id;

  if (!tempConfigs.has(userId)) {
    tempConfigs.set(userId, {
      OPTIONS: {},
      RPC: {},
      INPUTS: {}
    });
  }

  const userConfig = tempConfigs.get(userId);

  if (interaction.customId === "modal_options") {
    const location = interaction.fields.getTextInputValue("option_location");
    const tz = interaction.fields.getTextInputValue("option_tz");

    userConfig.OPTIONS = { location, tz };

    await interaction.reply({
      content: `✅ **OPTIONS saved!**\n\`\`\`yml\nOPTIONS:\n  location: ${location}\n  tz: ${tz}\n\`\`\``,
      ephemeral: true
    });
  }

  if (interaction.customId === "modal_status") {
    const delay = parseInt(interaction.fields.getTextInputValue("status_delay"));
    const dataText = interaction.fields.getTextInputValue("status_data");
    const data = dataText.split('\n').map(line => line.trim()).filter(Boolean);

    userConfig.STATUS = { delay, data };

    await interaction.reply({
      content: `✅ **STATUS saved!**\n\`\`\`yml\nSTATUS:\n  delay: ${delay}\n  data:\n${data.map(d => `    - "${d}"`).join('\n')}\n\`\`\``,
      ephemeral: true
    });
  }

  if (interaction.customId === "modal_rpc_basic") {
    const delay = parseInt(interaction.fields.getTextInputValue("rpc_delay"));
    const twitchURL = interaction.fields.getTextInputValue("rpc_twitch_url") || "";
    const youtubeURL = interaction.fields.getTextInputValue("rpc_youtube_url") || "";

    if (!userConfig.RPC) userConfig.RPC = {};
    userConfig.RPC.delay = delay;
    if (twitchURL && twitchURL !== "none") userConfig.RPC.TwitchURL = twitchURL;
    if (youtubeURL && youtubeURL !== "none") userConfig.RPC.YoutubeURL = youtubeURL;

    await interaction.reply({
      content: `✅ **RPC Basic settings saved!**`,
      ephemeral: true
    });
  }

  if (interaction.customId === "modal_rpc_content") {
    const detailsText = interaction.fields.getTextInputValue("rpc_details");
    const stateText = interaction.fields.getTextInputValue("rpc_state") || "";

    const details = detailsText.split('\n').map(line => line.trim()).filter(Boolean);
    const state = stateText.split('\n').map(line => line.trim()).filter(Boolean);

    if (!userConfig.RPC) userConfig.RPC = {};
    userConfig.RPC.details = details;
    if (state.length > 0) userConfig.RPC.state = state;

    await interaction.reply({
      content: `✅ **RPC Content saved!**`,
      ephemeral: true
    });
  }

  if (interaction.customId === "modal_rpc_images") {
    const largeImage = interaction.fields.getTextInputValue("rpc_large_image") || "none";
    const largeText = interaction.fields.getTextInputValue("rpc_large_text") || "";
    const smallImage = interaction.fields.getTextInputValue("rpc_small_image") || "none";
    const smallText = interaction.fields.getTextInputValue("rpc_small_text") || "";

    if (!userConfig.RPC) userConfig.RPC = {};
    userConfig.RPC.assetsLargeImage = [largeImage];
    if (largeText) userConfig.RPC.assetsLargeText = [largeText];
    if (smallImage) userConfig.RPC.assetsSmallImage = [smallImage];
    if (smallText) userConfig.RPC.assetsSmallText = [smallText];

    await interaction.reply({
      content: `✅ **RPC Images saved!**`,
      ephemeral: true
    });
  }

  if (interaction.customId === "modal_rpc_buttons") {
    const button1Label = interaction.fields.getTextInputValue("rpc_button1_label") || "";
    const button1Url = interaction.fields.getTextInputValue("rpc_button1_url") || "";
    const button2Label = interaction.fields.getTextInputValue("rpc_button2_label") || "";
    const button2Url = interaction.fields.getTextInputValue("rpc_button2_url") || "";

    if (!userConfig.RPC) userConfig.RPC = {};

    if (button1Label && button1Url) {
      userConfig.RPC.buttonFirst = [{ label: button1Label, url: button1Url }];
    }
    if (button2Label && button2Url) {
      userConfig.RPC.buttonSecond = [{ label: button2Label, url: button2Url }];
    }

    await interaction.reply({
      content: `✅ **RPC Buttons saved!**`,
      ephemeral: true
    });
  }

  if (interaction.customId === "modal_rpc_advanced") {
    const startTime = interaction.fields.getTextInputValue("rpc_timestamp_start") || "";
    const endTime = interaction.fields.getTextInputValue("rpc_timestamp_end") || "";

    if (!userConfig.RPC) userConfig.RPC = {};

    if ((startTime && startTime !== "none") || (endTime && endTime !== "none")) {
      userConfig.RPC.timestamp = {};
      if (startTime && startTime !== "none") userConfig.RPC.timestamp.start = startTime;
      if (endTime && endTime !== "none") userConfig.RPC.timestamp.end = endTime;
    }

    await interaction.reply({
      content: `✅ **RPC Timestamps saved!**`,
      ephemeral: true
    });
  }

  if (interaction.customId === "modal_inputs") {
    const activityType = interaction.fields.getTextInputValue("input_activity_type").toUpperCase();

    userConfig.INPUTS = {
      activity: { type: activityType }
    };

    await interaction.reply({
      content: `✅ **INPUTS saved!**\n\`\`\`yml\nINPUTS:\n  activity:\n    type: ${activityType}\n\`\`\``,
      ephemeral: true
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId !== "config_preview" && interaction.customId !== "config_save") {
    return;
  }

  const userId = interaction.user.id;

  if (interaction.customId === "config_preview") {
    const userConfig = tempConfigs.get(userId);

    if (!userConfig) {
      await interaction.reply({
        content: "❌ No configuration found. Please configure at least one section first!",
        ephemeral: true
      });
      return;
    }

    const yaml = require('yaml');
    const ymlContent = yaml.stringify(userConfig, { indent: 2 });

    await interaction.reply({
      content: `📄 **Your Current Configuration:**\n\`\`\`yml\n${ymlContent}\n\`\`\``,
      ephemeral: true
    });
  }

  if (interaction.customId === "config_save") {
    const userConfig = tempConfigs.get(userId);

    if (!userConfig || !userConfig.RPC || !userConfig.INPUTS) {
      await interaction.reply({
        content: "❌ Incomplete configuration! Please configure at least RPC and INPUTS sections.",
        ephemeral: true
      });
      return;
    }

    try {
      const configManager = require("./database/userConfig");

      configManager.saveUserConfig(userId, userConfig);

      tempConfigs.delete(userId);

      const yaml = require('yaml');
      const ymlContent = yaml.stringify(userConfig, { indent: 2 });

      await interaction.reply({
        content: `✅ **Configuration saved successfully!**\n\nYou can now use \`/start_streaming\` to activate your RPC!\n\n\`\`\`yml\n${ymlContent.slice(0, 1000)}${ymlContent.length > 1000 ? '\n...' : ''}\n\`\`\``,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to save configuration: ${error.message}`,
        ephemeral: true
      });
    }
  }
});

async function validateSelfbotToken(token) {
  return TokenValidator.validateToken(token);
}

client.login(process.env.TOKEN);