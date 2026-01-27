const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Professional moderation suite')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Kick a member from the server')
                .addUserOption(opt => opt.setName('target').setDescription('The member to kick').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick')))
        .addSubcommand(sub =>
            sub.setName('ban')
                .setDescription('Ban a member from the server')
                .addUserOption(opt => opt.setName('target').setDescription('The member to ban').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban')))
        .addSubcommand(sub =>
            sub.setName('mute')
                .setDescription('Mute a member (Timeout)')
                .addUserOption(opt => opt.setName('target').setDescription('The member to mute').setRequired(true))
                .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for the mute')))
        .addSubcommand(sub =>
            sub.setName('unmute')
                .setDescription('Remove mute from a member')
                .addUserOption(opt => opt.setName('target').setDescription('The member to unmute').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Delete a specified number of messages')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)))
        .addSubcommand(sub =>
            sub.setName('warn')
                .setDescription('Warn a member')
                .addUserOption(opt => opt.setName('target').setDescription('The member to warn').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning'))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const botMember = interaction.guild.members.me;

        // Extra security check for Administrator permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: 'You must have the **Administrator** permission to use this command!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Supreme', 
                iconURL: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp' 
            })
            .setTimestamp();

        // Immediate defer for responsiveness (except for clear which might be instant)
        if (subcommand !== 'clear') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        try {
            switch (subcommand) {
                case 'kick':
                    if (!target.kickable || target.roles.highest.position >= botMember.roles.highest.position) {
                        return interaction.editReply({ content: `I cannot kick **${target.user.tag}** due to role hierarchy!` });
                    }
                    await target.kick(reason);
                    embed.setColor('#FFA500').setTitle('Member Kicked').setDescription(`**User:** ${target.user.tag}\n**Reason:** ${reason}`);
                    break;

                case 'ban':
                    if (!target.bannable || target.roles.highest.position >= botMember.roles.highest.position) {
                        return interaction.editReply({ content: `I cannot ban **${target.user.tag}** due to role hierarchy!` });
                    }
                    await target.ban({ reason });
                    embed.setColor('#FF0000').setTitle('Member Banned').setDescription(`**User:** ${target.user.tag}\n**Reason:** ${reason}`);
                    break;

                case 'mute':
                    const duration = interaction.options.getInteger('duration');
                    if (target.roles.highest.position >= botMember.roles.highest.position) {
                        return interaction.editReply({ content: `I cannot mute **${target.user.tag}** due to role hierarchy!` });
                    }
                    await target.timeout(duration * 60 * 1000, reason);
                    embed.setColor('#FFFF00').setTitle('Member Muted').setDescription(`**User:** ${target.user.tag}\n**Duration:** ${duration} minutes\n**Reason:** ${reason}`);
                    break;

                case 'unmute':
                    await target.timeout(null);
                    embed.setColor('#00FF00').setTitle('Member Unmuted').setDescription(`**User:** ${target.user.tag}`);
                    break;

                case 'clear':
                    const amount = interaction.options.getInteger('amount');
                    const deleted = await interaction.channel.bulkDelete(amount, true);
                    embed.setColor('#00FFFF').setTitle('Messages Cleared').setDescription(`Successfully deleted **${deleted.size}** messages.`);
                    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });

                case 'warn':
                    // In a real bot, you'd save this to a database. For now, we'll just DM the user and log it.
                    try {
                        await target.send(`⚠️ You have been warned in **${interaction.guild.name}**\n**Reason:** ${reason}`);
                    } catch (e) {
                        console.log('Could not DM user');
                    }
                    embed.setColor('#FF4500').setTitle('Member Warned').setDescription(`**User:** ${target.user.tag}\n**Reason:** ${reason}`);
                    break;
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const errorMsg = `Error: ${error.message}`;
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};