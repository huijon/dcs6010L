/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var _ = require('underscore'),
        request = require('request'),
        async = require('async');

var host = "http://cammy-api.herokuapp.com/";
var camera_ip = "http://192.168.1.2";

var restarts = 0;
var last_reboot = new Date().getTime();

cycle = function cycle(callback) {
    //check that the camera admin interface is actually up first...

    request.get({
        url: camera_ip,
        auth: {
            user: "admin",
            pass: "password"
        },
        timeout: 1500
    }, function(error, response, body) {
        //console.log("Got back body: ", body);

        //give it at least 5 minutes since last reboot..
        if ((new Date().getTime() - last_reboot) / (1000 * 60) < 5) {
            if (body) {
                console.log("Admin interface is responding");
                request.get({
                    url: host + "cameras/1NJCM5/events?max_count=1&sort=-1&access_token=6a0cc941e4e7297d0a3fc199b0fc2f7f484624e6578b805b",
                    json: true
                },
                function(error, response, body) {
                    var snapshots, last_snapshots, last_date, now, diff, res;
                    res = body.response[0];
                    snapshots = res.snapshots;
                    last_snapshots = snapshots[res.end_timestamp * 1000 + ""];
                    last_date = new Date(res.end_timestamp * 1000);
                    now = new Date().getTime();
                    diff = (now - last_date) / (1000 * 60); //in minutes
                    console.log("It's been " + diff + " minutes since we last got a snapshot from the camera..");

                    //if the camera hasn't sent anything in the last 3 minutes, restart it!
                    if (diff > 3) {
                        last_reboot = new Date().getTime();
                        restarts++;
                        console.log("Restarting dcs-6010L for the " + restarts + "th time now!!");
                        request.get({
                            url: camera_ip + "/vb.htm?language=ie&setallreboot=1",
                            auth: {
                                user: "admin",
                                pass: "password"
                            }
                        }, function(error, response, body) {
                            return callback(null);
                        });
                    } else {
                        return process.nextTick(function() {
                            return callback(null);
                        });
                    }
                });
            } else {
                //console.log("Admin interface not back online yet...");
                process.stdout.write(".");
                return callback(null);
            }
        } else {
            process.stdout.write(".");
            return process.nextTick(function() {
                return callback(null);
            });
        }
    });
};

var cycle_delay = function(callback) {
    _.delay(cycle, 2000, callback);
};


async.forever(cycle_delay, function(error) {
    console.error("error occurred: ", error);
});
