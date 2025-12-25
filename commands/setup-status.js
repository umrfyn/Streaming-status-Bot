const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-status")
    .setDescription("Set up streaming status buttons (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "You do not have permission to use this command!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("streaming")
        .setLabel("Streaming")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("settings")
        .setLabel("Settings")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel('Video')
        .setURL('https://youtu.be/ulUS2mXUqKQ')
        .setEmoji('<:youtube:1153998429274517524>')
        .setStyle(ButtonStyle.Link)
    );

    // Create container with image and buttons inside using Components v2
    const container = new ContainerBuilder()
      .setAccentColor(0xfffdfd)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems({
          media: { url: "https://i.postimg.cc/8CjqZqzt/rgb-black.gif" }
        })
      )
      .addActionRowComponents(row);

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
