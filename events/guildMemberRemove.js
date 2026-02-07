const { Events } = require('discord.js');
const inviteManager = require('../inviteManager.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const guildId = member.guild.id;
        
        // Find who invited this person
        const joinData = await inviteManager.getJoinData(guildId, member.id);
        
        if (joinData && joinData.inviterId) {
            // NEW LOGIC: If the member was marked as FAKE when they joined, 
            // do NOT increment the "Left" count when they leave.
            if (joinData.isFake) {
                console.log(`[INVITES] Fake member ${member.user.tag} left. Ignoring for "Left" count.`);
                return;
            }

            const inviterId = joinData.inviterId;

            // PREVENT AUTOFARM: Only increment "Left" if they haven't been marked as left before
            if (joinData.hasLeft) {
                console.log(`[INVITES] Member ${member.user.tag} left again. Skipping "Left" increment to prevent autofarm.`);
                return;
            }

            const userData = await inviteManager.getUserData(guildId, inviterId);
            
            // Increase "left" count for non-fake members (Regular count remains unchanged)
            userData.left++;
            
            // Mark as left in history to prevent multiple increments
            await inviteManager.recordLeave(guildId, member.id);
            
            // Update the inviter's stats
            await inviteManager.updateUser(guildId, inviterId, userData);
            
            console.log(`[INVITES] Real member ${member.user.tag} left. Inviter ${inviterId} now has ${userData.regular} regular and ${userData.left} left.`);
        }
    },
};
