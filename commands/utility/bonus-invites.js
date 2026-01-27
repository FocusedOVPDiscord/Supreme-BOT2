const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const inviteManager = require('../../inviteManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bonus-invites')
        .setDescription('Add or remove bonus invites for a user (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Only Admins can use this
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to give bonus invites to')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('The amount of bonus invites to add (use negative numbers to remove)')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            // Get current user data
            const guildId = interaction.guild.id;
            const userData = inviteManager.getUserData(guildId, targetUser.id);
            const oldBonus = userData.bonus;
            const newBonus = oldBonus + amount;

            // Update bonus invites
            inviteManager.updateUser(guildId, targetUser.id, { bonus: newBonus });

            // Calculate total invites
            const total = userData.regular + newBonus - userData.left;

            // Create embed response
            const bonusEmbed = new EmbedBuilder()
                .setColor(amount > 0 ? '#00FF00' : '#FF9900')
                .setTitle(`Bonus Invites ${amount > 0 ? 'Added' : 'Removed'}`)
                .setDescription(`Successfully ${amount > 0 ? 'added' : 'removed'} **${Math.abs(amount)}** bonus invite${Math.abs(amount) !== 1 ? 's' : ''} ${amount > 0 ? 'to' : 'from'} ${targetUser}.`)
                .addFields(
                    { name: 'Previous Bonus', value: `${oldBonus}`, inline: true },
                    { name: 'New Bonus', value: `${newBonus}`, inline: true },
                    { name: 'Total Invites', value: `${total}`, inline: true }
                )
                .setFooter({ text: `Action performed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [bonusEmbed] });
        } catch (error) {
            console.error('Error updating bonus invites:', error);
            await interaction.reply({ 
                content: 'There was an error trying to update bonus invites.', 
                ephemeral: true 
            });
        }
    },
};