const Discord = require('discord.js')
const { DisTube } = require('distube')
const { YtDlpPlugin } = require('@distube/yt-dlp')

const client = new Discord.Client({
    intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES'],
})

const config = {
    prefix: '!',
    token: 'ODkwMjE3NzU5MjYxMjAwNDQ0.YUsl5Q.fTTojdAkyaHKvgupToKa8DgyYC8',
}

const distube = new DisTube(client, {
    searchSongs: 10,
    searchCooldown: 5,
    leaveOnStop: false,
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [
        new YtDlpPlugin()
    ],
    youtubeDL: false
});

client.distube = distube;
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()

client.on('ready', client => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on('messageCreate', message => {
    if (message.author.bot || !message.inGuild()) return
    if (!message.content.startsWith(config.prefix)) return
    const args = message.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/g)
    const command = args.shift()

    if (command === 'help' || command === 'h') {
        message.channel.send(
            `**Comandos: **
            \n - !play ou !p: tocar uma música Ex.: !p https://youtube.com/linkdasuamusica.
            \n - !repeat ou !loop: alternar modo de repetição.
            \n - !pause: pausar a música.
            \n - !resume: voltar a tocar a música.
            \n - !stop: parar a música.
            \n - !skip: próximo da fila, caso tenha!
            \n - !leave: desconectar o NeyBot :(
            \n - !fila: ver músicas que estão na fila.
            `,
        )
    }

    if (command === 'play' || command === 'p') {
        const voiceChannel = message.member?.voice?.channel;
        const string = args.join(' ')
        if (!string) return message.channel.send(`${client.emotes.error} | Insira um URL de música ou uma consulta para pesquisar.`)
        if (voiceChannel) {
            client.distube.play(voiceChannel, string, {
                message,
                textChannel: message.channel,
                member: message.member,
            })
        } else {
            message.channel.send(
                'Você deve ingressar em um canal de voz primeiro.',
            )
        }
    }

    if (['repeat', 'loop'].includes(command)) {
        const mode = distube.setRepeatMode(message)
        message.channel.send(
            `Defina o modo de repetição para \`${mode
                ? mode === 2
                    ? 'Todas as filas'
                    : 'Esta música'
                : 'Off'
            }\``,
        )
    }

    if (command === 'stop') {
        distube.stop(message)
        message.channel.send('Parou a música!')
    }

    if (command === 'leave') {
        distube.voices.get(message)?.leave()
        message.channel.send('Saia do canal de voz!')
    }

    if (command === 'resume') distube.resume(message)

    if (command === 'pause') distube.pause(message)

    if (command === 'skip') {
        const queueGet = distube.getQueue(message.guildId);
        console.log(queueGet)
        if (queueGet.songs.length <= 1) return;
        distube.skip(message)
    }

    if (command === 'fila') {
        const queue = distube.getQueue(message)
        if (!queue) {
            message.channel.send('Nada tocando agora!')
        } else {
            message.channel.send(
                `Fila atual:\n${queue.songs
                    .map(
                        (song, id) =>
                            `**${id ? id : 'Tocando'}**. ${song.name
                            } - \`${song.formattedDuration}\``,
                    )
                    .slice(0, 10)
                    .join('\n')}`,
            )
        }
    }

    if (
        [
            '3d',
            'bassboost',
            'echo',
            'karaoke',
            'nightcore',
            'vaporwave',
        ].includes(command)
    ) {
        const filter = distube.setFilter(message, command)
        message.channel.send(
            `Filtro de fila atual: ${filter.join(', ') || 'Off'}`,
        )
    }
})

// Queue status template
const status = queue =>
    `Volume: \`${queue.volume}%\` | Filter: \`${queue.filters.join(', ') || 'Off'
    }\` | Loop: \`${queue.repeatMode
        ? queue.repeatMode === 2
            ? 'All Queue'
            : 'This Song'
        : 'Off'
    }\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``

// DisTube event listeners, more in the documentation page
distube
    .on('playSong', (queue, song) =>
        queue.textChannel?.send(
            `Tocando \`${song.name}\` - \`${song.formattedDuration
            }\`\nSolicitado por: ${song.user}\n${status(queue)}`,
        ),
    )
    .on('addSong', (queue, song) =>
        queue.textChannel?.send(
            `Adicionado ${song.name} - \`${song.formattedDuration}\` para a fila por ${song.user}`,
        ),
    )
    .on('addList', (queue, playlist) =>
        queue.textChannel?.send(
            `Adicionado \`${playlist.name}\` playlist (${playlist.songs.length
            } músicas) na fila\n${status(queue)}`,
        ),
    )
    .on('error', (textChannel, e) => {
        console.error(e)
        textChannel.send(
            `Um erro encontrado: ${e.message.slice(0, 2000)}`,
        )
    })
    .on('finish', queue => queue.textChannel?.send('Finish queue!'))
    .on('finishSong', queue =>
        queue.textChannel?.send('Terminar música!'),
    )
    .on('disconnect', queue =>
        queue.textChannel?.send('Desconectado!'),
    )
    .on('empty', queue =>
        queue.textChannel?.send(
            'O canal de voz está vazio! Saindo do canal de voz...',
        ),
    )
    // DisTubeOptions.searchSongs > 1
    .on('searchResult', (message, result) => {
        let i = 0
        message.channel.send(
            `**Escolha um número das opções abaixo**\n${result
                .map(
                    song =>
                        `**${++i}**. ${song.name} - \`${song.formattedDuration
                        }\``,
                )
                .join(
                    '\n',
                )}\n*Digite qualquer outra coisa ou espere 30 segundos para cancelar*`,
        )
    })
    .on('searchCancel', message =>
        message.channel.send('Pesquisa cancelada'),
    )
    .on('searchInvalidAnswer', message =>
        message.channel.send('Número de resultado inválido.'),
    )
    .on('searchNoResult', message =>
        message.channel.send('Nenhum resultado encontrado!'),
    )
    .on('searchDone', () => { })

client.login(config.token)