const { Events } = require('discord.js');
const inviteManager = require('../inviteManager.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const guildId = member.guild.id;
            const userId = member.id;
            
            // 1. Fetch join data for this specific join session
            const joinData = await inviteManager.getJoinData(guildId, userId);
            
            if (!joinData || !joinData.inviterId) {
                console.log(`[INVITES] No join data for ${member.user.tag} (${userId}). Skipping "Left" logic.`);
                return;
            }

            // 2. ULTIMATE AUTOFARM PROTECTION:
            // Check if this specific user has ALREADY been counted as "Left" in the past.
            // If they have, we do NOT increment the left count again.
            if (joinData.hasLeft) {
                console.log(`[INVITES] ${member.user.tag} already has a "Left" record. Skipping increment.`);
                return;
            }

            // 3. FAKE PROTECTION:
            // Don't count departures for fake accounts.
            if (joinData.isFake) {
                console.log(`[INVITES] Fake member ${member.user.tag} left. Ignoring.`);
                return;
            }

            const inviterId = joinData.inviterId;
            const userData = await inviteManager.getUserData(guildId, inviterId);
            
            // 4. INCREMENT LEFT:
            // We increase the counter and IMMEDIATELY mark them as left in the DB.
            userData.left++;
            
            // Update the user's invite stats
            await inviteManager.updateUser(guildId, inviterId, userData);
            
            // Mark this user as having left in their join history
            await inviteManager.recordLeave(guildId, userId);
            
            console.log(`[INVITES] Real member ${member.user.tag} left. Inviter ${inviterId} now has ${userData.left} left.`);
        } catch (error) {
            console.error('[INVITES ERROR] Error in guildMemberRemove:', error);
        }
    },
};
