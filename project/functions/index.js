const functions = require('firebase-functions');
const {
    Storage
} = require('@google-cloud/storage');
const storage = new Storage({
    keyFilename: "./IPTV-c845f863c621.json"
});
const axios = require('axios');
const cheerio = require('cheerio');
const url = 'https://iptvcat.com/s/cartoon%20network';
const bucketName = 'iptv-e83c4.appspot.com';

exports.iptv = functions.https.onRequest(async (request, response) => {
    if (request.path == '/') {
        axios(url)
            .then(response => {
                const html = response.data;
                const $ = cheerio.load(html);
                const streamTable = $('.streams_table > tr.border-solid')

                var content = "#EXTM3U"

                for (i = 0; i < streamTable.length - 1; i++) {
                    var channel_name = $(streamTable.get(i)).find('td > span.channel_name').text()
                    var channel_score = parseInt($(streamTable.get(i)).find('td > .live > .green').text())
                    var channel_url = $(streamTable.get(i)).next().find('.get_vlc').attr('data-clipboard-text')
                    var info = '#EXTINF:-1 tvg-id="" group-title="TV",' + channel_name

                    if (channel_score > 80) {
                        content = content + "\n" + info
                        content = content + "\n" + channel_url
                    }
                }


                console.log(content)
                const fs = require('fs');
                fs.writeFileSync('./list.m3u8', content);

                // upload list to Cloud Storage
                storage.bucket(bucketName).upload("./list.m3u8", {
                    // Support for HTTP requests made with `Accept-Encoding: gzip`
                    gzip: true,
                    // By setting the option `destination`, you can change the name of the
                    // object you are uploading to a bucket.
                    metadata: {
                        // Enable long-lived HTTP caching headers
                        // Use only if the contents of the file will never change
                        // (If the contents will change, use cacheControl: 'no-cache')
                        cacheControl: 'no-cache',
                    },
                });
                return
            })
            .catch(console.error);
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