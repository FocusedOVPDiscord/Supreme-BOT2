const { Events } = require('discord.js');
const inviteManager = require('../inviteManager.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const guildId = member.guild.id;
        
        // Find who invited this person
        const joinData = inviteManager.getJoinData(guildId, member.id);
        
        if (joinData && joinData.inviterId) {
            // NEW LOGIC: If the member was marked as FAKE when they joined, 
            // do NOT increment the "Left" count when they leave.
            if (joinData.isFake) {
                console.log(`[INVITES] Fake member ${member.user.tag} left. Ignoring for "Left" count.`);
                return;
            }

            const inviterId = joinData.inviterId;
            const userData = inviteManager.getUserData(guildId, inviterId);
            
            // Increment "Left" count only for non-fake members
            userData.left++;
            
            // Update the inviter's stats
            inviteManager.updateUser(guildId, inviterId, userData);
            
            console.log(`[INVITES] Real member ${member.user.tag} left. Inviter ${inviterId} now has ${userData.left} left.`);
        }
    },
};