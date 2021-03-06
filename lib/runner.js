
const ChromeRemoteInterface = require('chrome-remote-interface');
const log = require('./logger')('runner');

module.exports = (run, config) => {

    const ChromeLauncher = require('./chrome-launcher')(config);

    return new Promise(function(resolve, reject) {

        let url = 'https://www.google.com/alerts';

        log('ChromeLauncher::launch()');
        ChromeLauncher.launch();

        // timeout so that chrome can launch
        setTimeout(() => {
            ChromeRemoteInterface().then(async (client) => {
                const helpers = require('./helpers.js')(client);

                log('Start init');
                try {
                    await Promise.all([
                      client.Network.enable(),
                      client.Network.clearBrowserCookies(),
                      client.Page.enable(),
                      client.DOM.enable(),
                      client.Runtime.enable(),
                      client.Page.navigate({ url })
                    ]);
                } catch (err) {
                    console.error({ 'Client init error': err });
                    ChromeLauncher.close();
                    return reject(err);
                }

                try {
                    log('DOM.getDocument()');
                    await client.DOM.getDocument();

                    // Run injected promise chain
                    log('Starting run() script');
                    const res = await run(client, helpers, config);
                    log('End run() script');

                    log('ChromeLauncher.close()');
                    ChromeLauncher.close();
                    resolve(res);
                    
                } catch (err) {
                    console.error({ 'Page interaction error': err });
                    client.close();
                    ChromeLauncher.close();
                    reject(err);
                }
            
            }).catch(err => {
                console.error({ 'Connection error': err });
                ChromeLauncher.close();
                reject(err);
            });
        }, 1000);
    });
};

