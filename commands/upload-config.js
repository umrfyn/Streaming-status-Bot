const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const configManager = require("../database/userConfig");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const YmlValidator = require("../utils/ymlValidator");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("upload-config")
    .setDescription("Upload a configuration file")
    .addAttachmentOption((option) =>
      option
        .setName("config")
        .setDescription("Your config.yml file")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const file = interaction.options.getAttachment("config");

      if (!file.name.endsWith(".yml") && !file.name.endsWith(".yaml")) {
        await interaction.editReply({
          content: "❌ Please upload a .yml or .yaml file",
        });
        return;
      }

      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const configText = await response.text();

      const validationResult = YmlValidator.validateConfig(configText);

      if (!validationResult.isValid) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Configuration Error")
          .setDescription("```" + validationResult.error + "```")
          .addFields({
            name: "How to Fix",
            value:
              "Make sure your configuration file:\n" +
              "• Is valid YAML format\n" +
              "• Has all required sections (STATUS, RPC, INPUTS)\n" +
              "• Contains valid values and delays ≥ 4000ms",
          });

        await interaction.editReply({
          embeds: [errorEmbed],
        });
        return;
      }

      const config = validationResult.config;
      const success = configManager.setUserConfig(interaction.user.id, config);

      if (success) {
        const configEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("Configuration Uploaded Successfully")
          .setDescription("Your YML configuration has been loaded successfully.");

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setURL(
              config.RPC?.buttonFirst?.[0]?.url ||
              "https://server.0nyx.wtf/"
            )
            .setLabel(
              config.RPC?.buttonFirst?.[0]?.label || "Miyako's server"
            )
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setURL(
              config.RPC?.buttonSecond?.[0]?.url ||
              "https://github.com/umrfyn/Streaming-status"
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

        await interaction.editReply({
          embeds: [configEmbed],
          components: [buttonRow, imageRow],
        });
      } else {
        await interaction.editReply({
          content: "❌ Failed to save configuration. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error processing config file:", error);

      const errorMessage = error.message.includes("heap")
        ? "Configuration file is too large. Please reduce the size of arrays in your config."
        : "Error processing the configuration file: " + error.message;

      await interaction.editReply({
        content: "❌ " + errorMessage,
      });
    }
  },
};