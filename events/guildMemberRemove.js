const { Events } = require('discord.js');
const inviteManager = require('../inviteManager.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const guildId = member.guild.id;
        console.log(`[DEBUG-REMOVE] Member ${member.user.tag} (${member.id}) left guild ${guildId}`);
        
        // Find who invited this person
        const joinData = await inviteManager.getJoinData(guildId, member.id);
        
        if (joinData && joinData.inviterId) {
            console.log(`[DEBUG-REMOVE] Join data found. Inviter: ${joinData.inviterId}, isFake: ${joinData.isFake}, hasLeft: ${joinData.hasLeft}`);
            
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

            // IMPORTANT: Only increment "Left" if this specific inviter was actually credited for the join.
            // If they joined via this inviter but were a "Returning member", no stats should change.
            // However, based on your request, we want to track the departure if it was a valid "Regular" invite.
            
            const userData = await inviteManager.getUserData(guildId, inviterId);
            
            // Increase "left" count
            userData.left++;
            
            // Mark as left in history to prevent multiple increments
            await inviteManager.recordLeave(guildId, member.id);
            
            // Update the inviter's stats
            await inviteManager.updateUser(guildId, inviterId, userData);
            
            console.log(`[INVITES] Real member ${member.user.tag} left. Inviter ${inviterId} now has ${userData.regular} regular and ${userData.left} left.`);
        } else {
            console.log(`[DEBUG-REMOVE] No join data found for member ${member.id}`);
        }
    },
};
