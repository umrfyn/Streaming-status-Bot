const yaml = require('yaml');

class YmlValidator {
    static validateConfig(ymlString) {
        try {
            const config = yaml.parse(ymlString);

            if (!config.OPTIONS) {
                throw new Error("Missing required 'OPTIONS' section");
            }

            if (!config.OPTIONS.location || typeof config.OPTIONS.location !== 'string') {
                throw new Error("OPTIONS.location must be a non-empty string");
            }

            if (!config.OPTIONS.tz || typeof config.OPTIONS.tz !== 'string') {
                throw new Error("OPTIONS.tz must be a non-empty string");
            }

            if (!config.RPC) {
                throw new Error("Missing required 'RPC' section");
            }

            if (typeof config.RPC.delay !== 'number') {
                throw new Error("RPC.delay must be a number");
            }

            if (config.RPC.delay < 4000) {
                throw new Error("RPC.delay must be at least 4000ms");
            }
            if (config.RPC.timestamp) {
                if (!config.RPC.timestamp.start || !config.RPC.timestamp.end) {
                    throw new Error("RPC.timestamp must have both 'start' and 'end' fields");
                }

                const startDate = new Date(config.RPC.timestamp.start);
                const endDate = new Date(config.RPC.timestamp.end);

                if (isNaN(startDate.getTime())) {
                    throw new Error("RPC.timestamp.start must be a valid ISO 8601 date");
                }

                if (isNaN(endDate.getTime())) {
                    throw new Error("RPC.timestamp.end must be a valid ISO 8601 date");
                }
            }
            const requiredRPCArrays = ['details', 'state', 'assetsLargeText', 'assetsSmallText', 'assetsLargeImage', 'assetsSmallImage'];

            for (const field of requiredRPCArrays) {
                if (!Array.isArray(config.RPC[field])) {
                    throw new Error(`RPC.${field} must be an array`);
                }
            }

            if (config.RPC.buttonFirst && Array.isArray(config.RPC.buttonFirst)) {
                config.RPC.buttonFirst.forEach((button, index) => {
                    if (!button.label || !button.url) {
                        throw new Error(`RPC.buttonFirst[${index}] must have 'label' and 'url' fields`);
                    }
                });
            }

            if (config.RPC.buttonSecond && Array.isArray(config.RPC.buttonSecond)) {
                config.RPC.buttonSecond.forEach((button, index) => {
                    if (!button.label || !button.url) {
                        throw new Error(`RPC.buttonSecond[${index}] must have 'label' and 'url' fields`);
                    }
                });
            }

            // Validate INPUTS section
            if (!config.INPUTS) {
                throw new Error("Missing required 'INPUTS' section");
            }

            if (!config.INPUTS.activity || !config.INPUTS.activity.type) {
                throw new Error("INPUTS.activity.type is required");
            }

            const validActivityTypes = ['PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'COMPETING'];
            if (!validActivityTypes.includes(config.INPUTS.activity.type)) {
                throw new Error(`INPUTS.activity.type must be one of: ${validActivityTypes.join(', ')}`);
            }

            return {
                isValid: true,
                config: config,
                error: null,
            };
        } catch (error) {
            return {
                isValid: false,
                config: null,
                error: error.message,
            };
        }
    }

    static parseYml(ymlString) {
        try {
            const config = yaml.parse(ymlString);
            return {
                success: true,
                data: config,
                error: null,
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error.message,
            };
        }
    }

    static stringifyYml(configObject) {
        try {
            const ymlString = yaml.stringify(configObject, {
                indent: 2,
                lineWidth: 0,
                minContentWidth: 0,
            });
            return {
                success: true,
                data: ymlString,
                error: null,
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error.message,
            };
        }
    }

    static validateStructure(config) {
        const errors = [];

        // Check OPTIONS
        if (!config.OPTIONS) errors.push("Missing OPTIONS section");
        else {
            if (!config.OPTIONS.location) errors.push("OPTIONS.location is required");
            if (!config.OPTIONS.tz) errors.push("OPTIONS.tz is required");
        }

        // Check RPC
        if (!config.RPC) errors.push("Missing RPC section");
        else {
            if (config.RPC.delay === undefined) errors.push("RPC.delay is required");
            if (!config.RPC.details) errors.push("RPC.details is required");
            if (!config.RPC.state) errors.push("RPC.state is required");
        }

        // Check INPUTS
        if (!config.INPUTS) errors.push("Missing INPUTS section");
        else {
            if (!config.INPUTS.activity) errors.push("INPUTS.activity is required");
            else if (!config.INPUTS.activity.type) errors.push("INPUTS.activity.type is required");
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : null,
        };
    }
}

module.exports = YmlValidator;
