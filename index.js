// Libs
const https = require('https');
const fs = require('fs');
const { Parser } = require('json2csv');
const delay = require('delay');

// addresses
const m = '';
const f = '';
const u = '';

// address add hodler
var mArr = [];
var fArr = [];
var uArr = [];

var test = true;

main(); // Lets start

/**
 * Runs the program
 */
async function main() {
    splash();
    console.log('Scanning ==> ' + u);
    pullTransactions(u, 1).then(function (data) {
        console.log(data);
        exportData(data, "User");
        console.log('Scan of ==> ' + f + ' complete');
    });
}

/**
 * Recursive function to pull all the transactions from a given address
 * @param {string} address The address we want data for
 * @param {int} page The page we want to pull data from
 */
async function pullTransactions(address, page) {
    console.log('Waiting ==> 20 second to prevent banning');
    await delay(20000);
    return new Promise(function (res, rej) {
        var uri = 'https://chain.api.btc.com/v3/address/' + address + '/tx?page=' + page;
        addreessArray = whichArray(address);
        getJSON(uri).then(function (data) {

            try {
                data = JSON.parse(data);
            } catch (error) {
                console.log("Error has occured. Either you have been banned or it is the last page.");
                console.log("Exporting what data we have");
                exportData(addreessArray, "User");
                res(addreessArray);
                return;
            }
            console.log(data);
            if (data.data.list.length != 0 && data.data.list != undefined) {
                data.data.list.forEach(element => {
                    var tempArray = processData(element, address);
                    tempArray.forEach(iElement => {
                        addreessArray.push(iElement);
                    });
                });
                pullTransactions(address, page + 1);
                console.log('Checking page ==> ' + page);
                console.log('Total Transactions found ==> ' + addreessArray.length);
                console.log('Progress Percent ==> ' + ((addreessArray.length / data.data.total_count) * 100).toFixed(2) + '%');
            } else {
                exportData(addreessArray, "User");
                res(addreessArray);
            }
        }).catch((error) => console.error(error));
    })
}

/**
 * Takes in each transaction, classifys it as deposit or withdraw then returns the JSON object
 * @param {array} element The element we want to process
 * @param {string} address our current address
 */
function processData(element, address) {
    var thisTransaction = [];
    var status = '';
    var value = 0;
    var unknownAddresses = [];
    var returnArrays = [];

    element.inputs.forEach(ielement => {
        // New method of exporting, we want each transaction to have its own row no matter of hash.

        var mostData = true; // use this to toggle between each transactions gets a row, or each hash gets a row

        if (mostData) {
            if (ielement.prev_addresses[0] != address) {
                var temp = {
                    'TimeStamp': timeConverter(element.block_time),
                    'Hash': element.hash,
                    'To': address,
                    'From': ielement.prev_addresses[0],
                    'Status': 'Deposit',
                    'Value': ielement.prev_value / 100000000
                }
                returnArrays.push(temp);
            } else {
                var temp = {
                    'TimeStamp': timeConverter(element.block_time),
                    'Hash': element.hash,
                    'To': ielement.prev_addresses[0],
                    'From': address,
                    'Status': 'Withdraw',
                    'Value': ielement.prev_value / 100000000
                }
                returnArrays.push(temp);
            }
        } else {
            element.inputs.forEach(ielement => {
                unknownAddresses.push(ielement.prev_addresses[0]);
            });

            element.outputs.forEach(innerElement => {
                if (innerElement.addresses[0] == address) {
                    var temp = {
                        'TimeStamp': timeConverter(element.block_time),
                        'Hash': element.hash,
                        'To': address,
                        'From': unknownAddresses.toString(),
                        'Status': 'Deposit',
                        'Value': innerElement.value / 100000000
                    }
                    returnArrays.push(temp);
                } else {
                    var temp = {
                        'TimeStamp': timeConverter(element.block_time),
                        'Hash': element.hash,
                        'To': unknownAddresses.toString(),
                        'From': address,
                        'Status': 'Withdraw',
                        'Value': innerElement.value / 100000000
                    }
                    returnArrays.push(temp);
                }
            });
        }
    });

    return returnArrays;
}

/**
 * Exports given JSON data to a CSV file
 * @param {json array} json The JSON we want to convert to a CSV
 * @param {string} filename The file name of the export
 */
function exportData(json, filename) {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(json);
    fs.writeFile(filename + '.csv', csv, function (err) {
        if (err) return console.log(err);
        console.log('Filesaved ==>' + filename + '.csv');
    });
}

/**
 * Takes in URL, pulls data in a promise
 * @param {string} url url to pull JSON from
 */
function getJSON(url) {
    return new Promise(function (resolve, reject) {

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://www.google.com/'
            }
        }
        const req = https.get(url, options, res => {
            let json = '';
            res.on('data', function (chunk) {
                console.log(chunk);
                json += chunk;
            });
            res.on('end', function () {
                resolve((json));
            });
        });
        req.on('error', function (err) {
            console.log(err);
        });
    });
};

/**
 * Returns the correct array for the given address
 * @param {string} address the address we want the array for
 */
function whichArray(address) {
    switch (address) {
        case m:
            return mArr;
        case f:
            return fArr;
        case u:
            return uArr;
        default:
            return null;
    }
}

/**
 * Converts UNIX to UTC
 * @param {int} UNIX_timestamp unix timestamp
 */
function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
}

/**
 * Displays the splash screen
 */
function splash() {
    console.log("");
    console.log('    ######  #######  #####     #####                                 ######               ');
    console.log('    #     #    #    #     #   #     # #    # # #####  ####  #    #   #     #  ####  ##### ');
    console.log('    #     #    #    #         #       ##   # #   #   #    # #    #   #     # #    #   #   ');
    console.log('    ######     #    #          #####  # #  # #   #   #      ######   ######  #    #   #   ');
    console.log('    #     #    #    #               # #  # # #   #   #      #    #   #     # #    #   #   ');
    console.log('    #     #    #    #     #   #     # #   ## #   #   #    # #    #   #     # #    #   #   ');
    console.log('    ######     #     #####     #####  #    # #   #    ####  #    #   ######   ####    #   ');
    console.log('                   The bot that tells you where the money came from                       ');
    console.log('                             Developed by Ryan Guarascia                                  ');
    console.log("");
}