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
var last_reboot = new Date().getTime() - 5 * 60 * 1000;

var dont_reboot_more_often_than_every_x_minutes = 4,
        hasnt_sent_anything_in_the_last_y_minutes = 2.5;

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

        if (body) {
            process.stdout.write("*");
            request.get({
                url: host + "cameras/1NJCM5/events?max_count=1&sort=-1&access_token=6a0cc941e4e7297d0a3fc199b0fc2f7f484624e6578b805b",
                json: true
            },
            function(error, response, body) {
                var snapshots, last_snapshots, last_date, now, diff, res, time_since_last_reboot;
                res = body.response[0];
                snapshots = res.snapshots;
                last_snapshots = snapshots[res.end_timestamp * 1000 + ""];
                last_date = new Date(res.end_timestamp * 1000);
                now = new Date().getTime();
                diff = (now - last_date) / (1000 * 60); //in minutes
                //console.log("It's been " + diff + " minutes since we last got a snapshot from the camera..");
                time_since_last_reboot = (new Date().getTime() - last_reboot) / (1000 * 60);
                console.log("\nx = " + time_since_last_reboot + "\ny = " + diff);
                //give it at least x minutes since last reboot..
                if (time_since_last_reboot > dont_reboot_more_often_than_every_x_minutes) {
                    //if the camera hasn't sent anything in the last y minutes, restart it!
                    if (diff > hasnt_sent_anything_in_the_last_y_minutes) {
                        last_reboot = new Date().getTime();
                        restarts++;
                        console.log("\nRestarting dcs-6010L for the " + restarts + "th time now!!");
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
                } else {
                    //console.log("time_since_last_reboot: " + time_since_last_reboot + " minutes.");
                    process.stdout.write(".");
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

    });
};

var cycle_delay = function(callback) {
    _.delay(cycle, 2000, callback);
};


async.forever(cycle_delay, function(error) {
    console.error("error occurred: ", error);
});
