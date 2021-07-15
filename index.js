//Current problems:

const Discord = require("discord.js");
const {
    prefix,
    token,
} = require("./config.json");
const ytdl = require("ytdl-core-discord");

const client = new Discord.Client();
const queue = new Map();
const yts = require('yt-search')
var stop_place_holder = false;

client.once('ready', () => {
    console.log('Okita?');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

//Reading Messages

client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    let args = message.content.substring(prefix.length).split(" ");

    console.log(message.content.substring(prefix.length).split(" "));

    switch (args[0]) {
        case `p`:
            execute(message, serverQueue);
            break;

        case `play`:
            execute(message, serverQueue);
            break;

        case `s`:
            skip(message, serverQueue);
            break;

        case `skip`:
            skip(message, serverQueue);
            break;

        case `stop`:
            stop(message, serverQueue);
            break;

        case 'pause':
            pause(message, serverQueue);
            break;

        case 'resume':
            resume(message, serverQueue);
            break;

        case 'remove':
            remove(message, serverQueue);
            break;

        case `send`:
            send(message);
            break;

        default:
            message.channel.send("すみません、よく分りませんが");
    }
});





async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "Hmmm, I'm not in a voice channel!!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need permissions to join and play, バカ!"
        );
    }

    // const songInfo = await ytdl.getInfo(args[1]);
    // const song = {
    //     title: songInfo.videoDetails.title,
    //     url: songInfo.videoDetails.video_url,
    // };

    let song;
    if (ytdl.validateURL(args[1])) {
        const songInfo = await ytdl.getInfo(args[1]);
        song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
    } else {
        const { videos } = await yts(args.slice(1).join(" "));
        if (!videos.length) return message.channel.send("No songs were found, バカ!");
        song = {
            title: videos[0].title,
            url: videos[0].url
        };
    }

    if (!serverQueue || stop_place_holder == true) {

        // Creating the contract for our queue
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 3,
            playing: true
        };

        // Setting the queue using our contract
        queue.set(message.guild.id, queueContruct);
        // Pushing the song to our songs array
        queueContruct.songs.push(song);

        try {
            // here we try joining voicechat and save connection into our object
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            // Calling the play function to start a song
            play(message.guild, queueContruct.songs[0], message);
            stop_place_holder = false;
        } catch (err) {
            //Printing the error message if the bot fails to join the voicechat
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`イエス、マイ　ロード, ${song.title} has been added to the Queue!`);
    }
}

async function play(guild, song, message) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        stop_place_holder = true;
        setTimeout(function() {
                message.channel.send("お先に失礼します，ご主人様!!");
                serverQueue.voiceChannel.leave();
                queue.delete(guild.id);
            }, 300000);
            return;
        }

    const dispatcher = serverQueue.connection
        .play(await ytdl(song.url), { type: 'opus' }) // ,bitrate: '192000'
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0],message);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Music playing: **${song.title}**`);
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "バカ, you have to be in a channel to stop the music!!"
        );
        serverQueue.songs = [];
        serverQueue.voiceChannel.leave();
        //queue.delete(guild.id); //add in guild parameter if want to use this, currently using stop_place_holder to do the job
        stop_place_holder = true;
    return message.channel.send("すべての音楽がスキップされました、マスター")
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "バカ, you have to be in a channel to stop the music!!"
        );
    if (!serverQueue)
        return message.channel.send("No songs that could be skipped, バカ!");
    serverQueue.connection.dispatcher.end("歌はスキップされました、マスター");
}

function remove(message, serverQueue) {
    if(!message.member.voice.channel) {
        return message.channel.send(
            "バカ, you have to be in a channel to stop the music!!"            
        );
    }
    
    var index = 0;
    var found = false;
    let args = message.content.substring(prefix.length+7).split(" ");
    console.log(args);
            for (const key_word of args) {
                for (const song of serverQueue.songs) {
                    if((song.title.includes(key_word)) || song.title.toLowerCase().includes(key_word)) {
                        message.channel.send(`Music Removed: ${song.title}`);
                        found = true;
                        serverQueue.songs.splice(index,1);
                        break;
                    } else {
                        index++;
                    }
                } if(found) {
                    break;
                }
            }

            if (!found) {
                message.channel.send(`バカ, Music Removal of ${message.content.substring(prefix.length+7)} was unsuccessful!`);
            }
    }

function pause(message, serverQueue) {

    if (!serverQueue) return message.channel.send("今は音楽がありません");

    if (message.member.voiceChannel != message.guild.me.voiceChannel) return message.channel.send("君と♫♫は同じチャネルではありませんよ");

    if (serverQueue.connection.dispatcher.paused) return message.channel.send("音楽が止まらないよ");

    serverQueue.connection.dispatcher.pause();

    message.channel.send(`Music Pause: ${serverQueue.songs[0].title}`);
}

function resume(message, serverQueue) {

    if (!serverQueue) return message.channel.send("今は音楽がありません");

    if (message.member.voiceChannel != message.guild.me.voiceChannel) return message.channel.send("君と♫♫は同じチャネルではありませんよ");

    if (!serverQueue.connection.dispatcher.paused) return message.channel.send("音楽續けができません");

    serverQueue.connection.dispatcher.resume();
    serverQueue.connection.dispatcher.pause();      //!!!!
    serverQueue.connection.dispatcher.resume();     //!!!!

    message.channel.send(`Music Resume: ${serverQueue.songs[0].title}`);
}

function send(message) {
    let args = message.content.substring(prefix.length).split(" ");
    switch (args[0]) {
        case `send`:
            var images = new Array("https://i.redd.it/e6zzgbzpkt551.jpg",
                "https://n.sinaimg.cn/sinakd10113/612/w2000h1012/20200605/5a8d-iurnkpq9019017.jpg",
                "./images/1.jpg",
                "./images/2.jpg",
                "./images/3.jpg",
                "./images/4.jpg",
                "./images/5.jpg",
                "./images/6.jpg",
                "./images/8.jpg",
                "./images/9.jpg",
                "./images/10.jpg",
                "./images/11.jpg",
                "./images/12.jpg",
                "./images/13.jpg",
                "./images/14.jpg",
                "./images/15.jpg",
                "./images/16.jpg",
                "./images/17.jpg",
                "./images/18.jpg",
                "./images/19.jpg",
                "./images/20.jpg",
                "./images/21.jpg",
                "./images/22.jpg",
                "./images/23.jpg",
                "./images/24.jpg",
                "./images/25.jpg",
                "./images/26.jpg",
                "./images/27.jpg",
                "./images/28.jpg",
                "./images/29.jpg",
                "./images/30.jpg",
                "./images/31.jpg",
                "./images/32.jpg",
                "./images/33.jpg",
                "./images/34.jpg",
                "./images/35.jpg",
                "./images/36.jpg",
                "./images/37.jpg",
                "./images/38.jpg",
                "./images/100.png",
                "./images/101.png",
                "./images/102.png",
                "./images/103.png",
                "./images/104.png",
                "./images/105.png"
            );
            const attachment = new Discord.MessageAttachment(images[getRandomInt(0, images.length)]);
            message.channel.send(message.author, attachment);
            break;
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

client.login(process.env.TOKEN);

// client.on // changed to switch
//     if(message.content.startsWith(`${prefix}play`)
//         ||message.content.startsWith(`${prefix}p`)
//             ||message.content.startsWith('...p')) {
//         execute(message, serverQueue);
//         return;
//     } else if(message.content.startsWith(`${prefix}skip`)) {
//         skip(message, serverQueue);
//         return;
//     } else if(message.content.startsWith(`${prefix}stop`)) {
//         stop(message, serverQueue);
//         return;
//     } else if(message.content.startsWith(`${prefix}send`)
//                 ||message.content.startsWith('^v^')) {
//         send(message);
//     } else {
//         message.channel.send("すみません、よく分りませんが")
//     }
// });

//Adding songs