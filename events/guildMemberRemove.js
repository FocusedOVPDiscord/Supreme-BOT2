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
            
            // Log the member leaving without auto-incrementing the "Left" count
            console.log(`[INVITES] Real member ${member.user.tag} left. Invited by ${inviterId}. Left count NOT auto-incremented.`);
        }
    },
};
