const { Events } = require('discord.js');
const inviteManager = require('../inviteManager.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const guildId = member.guild.id;
            const userId = member.id;
            
            // 1. Fetch join data to identify the inviter and current status
            const joinData = await inviteManager.getJoinData(guildId, userId);
            
            if (!joinData || !joinData.inviterId) {
                console.log(`[INVITES] No inviter found for ${member.user.tag}. Skipping "Left" logic.`);
                return;
            }

            if (joinData.isFake) {
                console.log(`[INVITES] Fake member ${member.user.tag} left. Ignoring.`);
                return;
            }

            // 2. ATOMIC LOCK: Attempt to mark the user as 'left' in the database.
            // This operation is ATOMIC. If recordLeave returns true, it means they 
            // were NOT already marked as left, and we have successfully "claimed" 
            // the right to increment the left count exactly once.
            const wasSuccessfullyMarkedAsLeft = await inviteManager.recordLeave(guildId, userId);
            
            if (!wasSuccessfullyMarkedAsLeft) {
                console.log(`[INVITES] ${member.user.tag} already counted as Left (Database Lock). Skipping increment.`);
                return;
            }

            // 3. SYNC STATS:
            // Instead of just incrementing, we trigger a full sync of the inviter's stats.
            // This will RE-COUNT the actual people who have left and fix any previous "farmed" numbers.
            const inviterId = joinData.inviterId;
            await inviteManager.syncUserInvites(guildId, inviterId);
            
            console.log(`[INVITES] SUCCESS: ${member.user.tag} left. Inviter ${inviterId} stats synchronized and healed.`);
        } catch (error) {
            console.error('[INVITES ERROR] Fatal error in guildMemberRemove:', error);
        }
    },
};
