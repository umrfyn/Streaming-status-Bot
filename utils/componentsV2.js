/**
 * Discord Components V2 Helper Utility
 * Provides helper functions for creating Components v2 messages
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    MessageFlags,
    ActionRowBuilder,
} = require("discord.js");

/**
 * Creates a container with accent color and text content
 * @param {Object} options - Container options
 * @param {number} options.accentColor - Accent color (hex number)
 * @param {string} options.content - Main text content (markdown supported)
 * @param {string} [options.title] - Optional title (will be formatted as header)
 * @param {string} [options.footer] - Optional footer text
 * @param {string[]} [options.imageUrls] - Optional image URLs for media gallery
 * @param {Array} [options.fields] - Optional fields array [{name, value, inline}]
 * @returns {ContainerBuilder}
 */
function createContainer(options = {}) {
    const container = new ContainerBuilder();

    if (options.accentColor) {
        container.setAccentColor(options.accentColor);
    }

    // Add title if provided
    if (options.title) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${options.title}`)
        );
    }

    // Add main content
    if (options.content) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(options.content)
        );
    }

    // Add fields if provided
    if (options.fields && options.fields.length > 0) {
        for (const field of options.fields) {
            const fieldContent = field.inline
                ? `**${field.name}**: ${field.value}`
                : `**${field.name}**\n${field.value}`;
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(fieldContent)
            );
        }
    }

    // Add images if provided
    if (options.imageUrls && options.imageUrls.length > 0) {
        const gallery = new MediaGalleryBuilder();
        for (const url of options.imageUrls) {
            gallery.addItems({ media: { url } });
        }
        container.addMediaGalleryComponents(gallery);
    }

    // Add footer if provided
    if (options.footer) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# ${options.footer}`)
        );
    }

    return container;
}

/**
 * Creates a simple text container (replacement for simple embeds)
 * @param {string} content - Text content
 * @param {number} [accentColor] - Optional accent color
 * @returns {ContainerBuilder}
 */
function createTextContainer(content, accentColor = null) {
    const container = new ContainerBuilder();
    if (accentColor) {
        container.setAccentColor(accentColor);
    }
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
    );
    return container;
}

/**
 * Creates a container with an image
 * @param {string} imageUrl - Image URL
 * @param {number} [accentColor] - Optional accent color
 * @returns {ContainerBuilder}
 */
function createImageContainer(imageUrl, accentColor = null) {
    const container = new ContainerBuilder();
    if (accentColor) {
        container.setAccentColor(accentColor);
    }
    const gallery = new MediaGalleryBuilder();
    gallery.addItems({ media: { url: imageUrl } });
    container.addMediaGalleryComponents(gallery);
    return container;
}

/**
 * Builds a V2 message payload with proper flags
 * @param {ContainerBuilder|ContainerBuilder[]} containers - Container(s) to include
 * @param {ActionRowBuilder[]} [actionRows] - Optional action rows with buttons
 * @param {Object} [extraOptions] - Extra options like ephemeral
 * @returns {Object} Message payload ready for reply/editReply/update
 */
function buildV2Message(containers, actionRows = [], extraOptions = {}) {
    const containerArray = Array.isArray(containers) ? containers : [containers];

    const payload = {
        components: [...containerArray, ...actionRows],
        flags: MessageFlags.IsComponentsV2,
        ...extraOptions,
    };

    return payload;
}

/**
 * Builds an ephemeral V2 message
 * @param {ContainerBuilder|ContainerBuilder[]} containers - Container(s) to include
 * @param {ActionRowBuilder[]} [actionRows] - Optional action rows with buttons
 * @returns {Object} Message payload with ephemeral flag
 */
function buildEphemeralV2Message(containers, actionRows = []) {
    const containerArray = Array.isArray(containers) ? containers : [containers];

    return {
        components: [...containerArray, ...actionRows],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    };
}

// Color constants matching common embed colors
const Colors = {
    Success: 0x2ecc71,
    Error: 0xe74c3c,
    Warning: 0xf1c40f,
    Info: 0x3498db,
    White: 0xffffff,
    LightGray: 0xf1efef,
    Purple: 0x703487,
};

module.exports = {
    createContainer,
    createTextContainer,
    createImageContainer,
    buildV2Message,
    buildEphemeralV2Message,
    Colors,
};
