const functions = require('firebase-functions');
const {
    Storage
} = require('@google-cloud/storage');
const storage = new Storage({
    keyFilename: "./IPTV-c845f863c621.json"
});
const axios = require('axios');
const cheerio = require('cheerio');
const bucketName = 'iptv-e83c4.appspot.com';
const urls = [
    'https://iptvcat.com/cambodia',
    'https://iptvcat.com/united%20states%20of%20america/s/cartoon%20network',
    'https://iptvcat.com/south%20america/s/fox%20sport',
    'https://iptvcat.com/thailand',
    'https://iptvcat.com/south%20korea/s/Arirang',
    'https://iptvcat.com/south%20korea/s/SBS%20International',
    'https://iptvcat.com/japan/s/nhk%20world%20japan',
    'https://iptvcat.com/united%20kingdom/s/disney%20channel',
    'https://iptvcat.com/united%20states%20of%20america/s/hbo'
]

scrapping = function (content, completion) {
    if (urls.length > 0) {
        console.log("Start Scrapping " + urls[0])
        setTimeout(() => {
            axios(urls[0])
                .then(response => {
                    const html = response.data;
                    const $ = cheerio.load(html);
                    const streamTable = $('.streams_table > tr.border-solid')

                    for (i = 0; i < streamTable.length - 1; i++) {
                        var channel_name = $(streamTable.get(i)).find('td > span.channel_name').text()
                        var channel_score = parseInt($(streamTable.get(i)).find('td > .live > .green').text())
                        var channel_url = $(streamTable.get(i)).next().find('.get_vlc').attr('data-clipboard-text')
                        var info = '#EXTINF:-1 tvg-id="" group-title="TV",' + channel_name

                        if (channel_score > 94) {
                            content = content + "\n" + info
                            content = content + "\n" + channel_url
                        }
                    }
                    console.log("Finished Scrapping " + urls[0])
                    urls.splice(0, 1)
                    scrapping(content, completion)
                })
                .catch(console.error);
        }, 1000)
    } else {
        completion(content)
    }
}

exports.iptv = functions.https.onRequest(async (request, response) => {
    if (request.path == '/') {
        var content = "#EXTM3U"
        scrapping(content, (list) => {
            const fs = require('fs');
            fs.writeFileSync('./list.m3u8', list);
        })
        response.send("Hello from Firebase!");
    } else if (request.path == '/list') {
        let fs = require('fs')
        const srcFilename = "list.m3u8"
        const destFilename = "./playlist.m3u8"
        const options = {
            // The path to which the file should be downloaded, e.g. "./file.txt"
            destination: destFilename,
        };
        if (fs.existsSync(destFilename)) {
            fs.unlinkSync(destFilename)
        }
        // Downloads the file
        await storage.bucket(bucketName).file(srcFilename).download(options);

        console.log(
            `gs://${bucketName}/${srcFilename} downloaded to ${destFilename}.`
        );

        let content = fs.readFileSync(process.cwd() + "/" + destFilename).toString()
        response.send(content);
    }
});