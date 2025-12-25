const {
  SlashCommandBuilder,
  ModalBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
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
    .setDescription("Upload a configuration file"),

  async execute(interaction) {
    try {
      // Create file upload component
      const fileUpload = new FileUploadBuilder()
        .setCustomId("config_file_upload")
        .setRequired(true);

      // Create modal with file upload using LabelBuilder
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
    } catch (error) {
      console.error("Error showing upload config modal:", error);

      // Fallback error message
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("❌ Error showing upload modal: " + error.message)
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }
  },
};