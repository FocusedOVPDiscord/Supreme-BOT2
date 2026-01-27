const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TRANSCRIPT_CHANNEL_ID = '1464802432155652168';

/**
 * Generates a professional transcript for a closed ticket
 * @param {Object} channel - The ticket channel
 * @param {Object} closedBy - The user who closed the ticket
 * @param {Object} ticketData - Additional ticket metadata (partner, type, details)
 * @returns {Promise<boolean>} - Success status
 */
async function generateAndSendTranscript(channel, closedBy, ticketData = {}) {
    try {
        const guild = channel.guild;
        const transcriptChannel = await guild.channels.fetch(TRANSCRIPT_CHANNEL_ID).catch(() => null);
        
        if (!transcriptChannel) {
            console.error('[TRANSCRIPT] Transcript channel not found:', TRANSCRIPT_CHANNEL_ID);
            return false;
        }

        // Fetch all messages from the ticket channel
        let messages = await fetchAllMessages(channel);
        
        // Filter out bot messages as requested
        messages = messages.filter(msg => !msg.author.bot);
        
        // Extract ticket number from channel name
        const ticketNumber = channel.name.replace('ticket-', '');
        
        // Get ticket creator (first user mentioned in permissions)
        let ticketCreator = null;
        for (const [id, permission] of channel.permissionOverwrites.cache) {
            const member = await guild.members.fetch(id).catch(() => null);
            if (member && !member.user.bot) {
                ticketCreator = member.user;
                break;
            }
        }

        // Calculate ticket statistics
        const createdAt = channel.createdAt;
        const closedAt = new Date();
        const duration = closedAt - createdAt;
        const durationText = formatDuration(duration);
        
        // Get unique participants (excluding bots)
        const participants = new Set();
        messages.forEach(msg => {
            if (!msg.author.bot) {
                participants.add(msg.author.tag);
            }
        });

        // Generate text transcript
        const transcriptText = generateTextTranscript(
            ticketNumber,
            ticketCreator,
            closedBy,
            createdAt,
            closedAt,
            durationText,
            messages,
            ticketData,
            Array.from(participants)
        );

        // Save transcript to file
        const transcriptDir = path.join(__dirname, '../transcripts');
        if (!fs.existsSync(transcriptDir)) {
            fs.mkdirSync(transcriptDir, { recursive: true });
        }
        
        const filename = `ticket-${ticketNumber}-${Date.now()}.txt`;
        const filepath = path.join(transcriptDir, filename);
        fs.writeFileSync(filepath, transcriptText);

        // Create professional embed
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Supreme Ticket System', 
                iconURL: guild.iconURL() || 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663279443187/quPXEUrjrufgRMwQ.webp'
            })
            .setTitle(`📋 Ticket #${ticketNumber} - Transcript`)
            .setColor('#2B2D31')
            .addFields(
                { 
                    name: '👤 Ticket Creator', 
                    value: ticketCreator ? `${ticketCreator.tag} (${ticketCreator.id})` : 'Unknown', 
                    inline: true 
                },
                { 
                    name: '🔒 Closed By', 
                    value: `${closedBy.tag} (${closedBy.id})`, 
                    inline: true 
                },
                { 
                    name: '⏱️ Duration', 
                    value: durationText, 
                    inline: true 
                },
                { 
                    name: '💬 Total Messages', 
                    value: messages.length.toString(), 
                    inline: true 
                },
                { 
                    name: '👥 Participants', 
                    value: participants.size.toString(), 
                    inline: true 
                },
                { 
                    name: '📅 Created', 
                    value: `<t:${Math.floor(createdAt.getTime() / 1000)}:F>`, 
                    inline: true 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Supreme Middleman Service', iconURL: guild.iconURL() });

        // Add trade details if available
        if (ticketData.partner || ticketData.type || ticketData.details) {
            let tradeInfo = '';
            if (ticketData.partner) tradeInfo += `**Partner:** ${ticketData.partner}\n`;
            if (ticketData.type) tradeInfo += `**Type:** ${ticketData.type}\n`;
            if (ticketData.details) tradeInfo += `**Details:** ${ticketData.details.substring(0, 200)}${ticketData.details.length > 200 ? '...' : ''}`;
            
            if (tradeInfo) {
                embed.addFields({ name: '💸 Trade Information', value: tradeInfo, inline: false });
            }
        }

        // Send transcript to the designated channel
        const attachment = new AttachmentBuilder(filepath, { name: filename });
        
        await transcriptChannel.send({
            embeds: [embed],
            files: [attachment]
        });

        console.log(`[TRANSCRIPT] Successfully generated transcript for ticket #${ticketNumber}`);
        return true;

    } catch (error) {
        console.error('[TRANSCRIPT] Error generating transcript:', error);
        return false;
    }
}

/**
 * Fetches all messages from a channel
 * @param {Object} channel - The channel to fetch messages from
 * @returns {Promise<Array>} - Array of messages
 */
async function fetchAllMessages(channel) {
    const messages = [];
    let lastId;

    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const batch = await channel.messages.fetch(options);
        messages.push(...batch.values());

        if (batch.size < 100) break;
        lastId = batch.last().id;
    }

    return messages.reverse(); // Oldest first
}

/**
 * Generates formatted text transcript
 */
function generateTextTranscript(ticketNumber, creator, closedBy, createdAt, closedAt, duration, messages, ticketData, participants) {
    let transcript = '';
    
    // Header
    transcript += '═══════════════════════════════════════════════════════════════\n';
    transcript += '                    SUPREME MIDDLEMAN SERVICE                    \n';
    transcript += '                      TICKET TRANSCRIPT                          \n';
    transcript += '═══════════════════════════════════════════════════════════════\n\n';
    
    // Ticket Information
    transcript += `Ticket Number:    #${ticketNumber}\n`;
    transcript += `Created By:       ${creator ? `${creator.tag} (${creator.id})` : 'Unknown'}\n`;
    transcript += `Closed By:        ${closedBy.tag} (${closedBy.id})\n`;
    transcript += `Created At:       ${createdAt.toUTCString()}\n`;
    transcript += `Closed At:        ${closedAt.toUTCString()}\n`;
    transcript += `Duration:         ${duration}\n`;
    transcript += `Total Messages:   ${messages.length}\n`;
    transcript += `Participants:     ${participants.length}\n\n`;
    
    // Trade Details
    if (ticketData.partner || ticketData.type || ticketData.details) {
        transcript += '───────────────────────────────────────────────────────────────\n';
        transcript += '                       TRADE DETAILS                           \n';
        transcript += '───────────────────────────────────────────────────────────────\n\n';
        
        if (ticketData.partner) {
            transcript += `Trading Partner:\n${ticketData.partner}\n\n`;
        }
        if (ticketData.type) {
            transcript += `Trade Type:\n${ticketData.type}\n\n`;
        }
        if (ticketData.details) {
            transcript += `Trade Description:\n${ticketData.details}\n\n`;
        }
    }
    
    // Participants List
    transcript += '───────────────────────────────────────────────────────────────\n';
    transcript += '                         PARTICIPANTS                           \n';
    transcript += '───────────────────────────────────────────────────────────────\n\n';
    participants.forEach((participant, index) => {
        transcript += `${index + 1}. ${participant}\n`;
    });
    transcript += '\n';
    
    // Message History
    transcript += '═══════════════════════════════════════════════════════════════\n';
    transcript += '                       MESSAGE HISTORY                          \n';
    transcript += '═══════════════════════════════════════════════════════════════\n\n';
    
    messages.forEach(msg => {
        const timestamp = msg.createdAt.toUTCString();
        const author = msg.author.tag;
        const content = msg.content || '[No text content]';
        
        transcript += `[${timestamp}]\n`;
        transcript += `${author}:\n`;
        transcript += `${content}\n`;
        
        // Add attachments
        if (msg.attachments.size > 0) {
            transcript += `\nAttachments:\n`;
            msg.attachments.forEach(att => {
                transcript += `  - ${att.name} (${att.url})\n`;
            });
        }
        
        // Bot messages and embeds are filtered out at the message level
        // Only user messages with text or attachments will be shown here
        
        transcript += '\n';
    });
    
    // Footer
    transcript += '═══════════════════════════════════════════════════════════════\n';
    transcript += '                      END OF TRANSCRIPT                         \n';
    transcript += '═══════════════════════════════════════════════════════════════\n';
    
    return transcript;
}

/**
 * Formats duration in a human-readable format
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    generateAndSendTranscript
};
