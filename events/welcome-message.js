const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const guildId = member.guild.id;

        // --- 1. AUTO-ROLE LOGIC ---
        // This uses the 'autoRoleId' key from your /auto-role command
        const autoRoleId = storage.get(guildId, 'autoRoleId');
        if (autoRoleId) {
            try {
                const role = member.guild.roles.cache.get(autoRoleId);
                if (role) {
                    await member.roles.add(role);
                    console.log(`[ROLES] Assigned auto-role ${role.name} to ${member.user.tag}`);
                }
            } catch (err) {
                console.error('[ROLES] Failed to assign auto-role:', err);
            }
        }

        // --- 2. INVITE TRACKING LOGIC ---
        let inviterMention = "Unknown";
        try {
            const newInvites = await member.guild.invites.fetch();
            const cachedInvites = member.client.invites.get(guildId) || new Map();
            const invite = newInvites.find(i => i.uses > (cachedInvites.get(i.code) || 0));
            
            newInvites.forEach(i => cachedInvites.set(i.code, i.uses));
            member.client.invites.set(guildId, cachedInvites);

            if (invite && invite.inviter) {
                const inviterId = invite.inviter.id;
                inviterMention = `<@${inviterId}>`;

                const isFake = inviteManager.isFakeMember(member);
                const userData = inviteManager.getUserData(guildId, inviterId);

                if (!inviteManager.hasJoinedBefore(guildId, member.id)) {
                    if (isFake) {
                        userData.fake++;
                    } else {
                        userData.regular++;
                    }
                    inviteManager.recordJoin(guildId, member.id, inviterId, isFake);
                }
                inviteManager.updateUser(guildId, inviterId, userData);
            }
        } catch (e) { 
            console.error('[INVITES] Error:', e); 
        }

        // --- 3. WELCOME MESSAGE LOGIC ---
        const config = storage.get(guildId, 'welcome_config');
        if (!config) return;

        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(config.title || member.guild.name)
            .setDescription(`${config.description}\n\n**Invited by:** ${inviterMention}`)
            .setImage(config.bannerUrl)
            .setFooter({ text: `Thank you for choosing ${member.guild.name}!`, iconURL: member.guild.iconURL() })
            .setTimestamp()
            .setColor('#00FF00');

        try {
            await channel.send({ 
                content: `${member} Welcome To ${member.guild.name}`,
                embeds: [embed]
            });
        } catch (error) {
            console.error('[WELCOME] Error:', error);
        }
    },
};