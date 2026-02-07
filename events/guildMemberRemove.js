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

            // 3. INCREMENT LEFT:
            // Since we successfully claimed the lock, we now increment the inviter's count.
            const inviterId = joinData.inviterId;
            await inviteManager.updateUser(guildId, inviterId, { left: 1, left_increment: true });
            
            console.log(`[INVITES] SUCCESS: ${member.user.tag} left. Inviter ${inviterId} left count incremented (Atomic Lock applied).`);
        } catch (error) {
            console.error('[INVITES ERROR] Fatal error in guildMemberRemove:', error);
        }
    },
};
