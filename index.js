"use strict";
let port=8080;
if (process.argv.length > 2) {
    let portArg = process.argv[1];
    if (portArg != "") {
        console.log("trying to parse [" + portArg + "]");
        port = parseInt(portArg,10);
    }
}

var pageCache = {};
const PageName = Object.freeze({loginForm:"loginform.html", app: "app.html", appjs: "javascript/appjs.js"});

const name = 'PPH';

const express = require('express');
const app = express();
const express_session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const mime = require('mime');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
var cresponse = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 8).toUpperCase(); 
var list = [];
var collectionFileName = "images/collection.list";
const mountLocation = "/media/pi/";

app.use(express_session({
    'secret': '34P3ji43j4n3jn4jk3n'
}))
app.use(bodyParser.json()); // support json encoded body
app.use(bodyParser.urlencoded({ extended: true })); // support standard encoded body
app.use(cookieParser());

app.get('/', (req, res, next) => {
    logReq(req);
    let session = req.session; 
    let html = '';
    if (checkAuth(session)) {
        html = getPage(PageName.app);
        let model = { "PlaceHolder": "00" };
        html = renderTemplate(model, html);
        res.send(html);
    } else {
        session.auth = "";
        cresponse = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 8).toUpperCase(); 
        html = getPage(PageName.loginForm);
        let model = { "challenge": cresponse};
        html = renderTemplate(model, html);
        res.send(html);
    }
    //next();
});

app.post('/', (req, res) => {
    logReq(req);
    let challenge = req.body.challenge;
    req.session.auth="";
    if (challenge == cresponse[2]) {
        req.session.auth="XY";
        setExpireAuth(req.session);
    } 
    //res.send(`Challenge [${challenge}]`);
    res.redirect('/');
});

app.get('/images/image', (req, res) => {
    logReq(req);
    let index = req.query.index;
    let path = list[getInteralIndex(index)];
    let fileName = path;
    res.cookie("imagePath",path);
    res.set('Content-Type', mime.getType(fileName));
    fs.readFile(fileName, function (err, data) {
        if (err) {
            console.log("Cannot load[" + fileName + "] " + err); 
        } else {
            res.end(data);
        }
    });
})

app.get('/javascript/script.js', (req, res) => {
    logReq(req);
    let html = getPage(PageName.appjs);
    let model = { "challenge": cresponse};
    html = renderTemplate(model, html);
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    res.send(html);
})

app.get('/api/loadlist', (req, res) => {
    logReq(req);
    findCollection( function(err, fn) { 
        if (err) {
            console.log(err);
            //res.json({result:false, message:"failed to access collection"});
           // return;
            fn="testimages/collection.list"
        }
        collectionFileName = fn; 
        fs.readFile(collectionFileName, 'utf8', function (err, data) {
            if (err) {
                console.log("Cannot load[" + collectionFileName + "] " + err); 
                res.json({result:false, message:"failed to load collection"});
            } else {
                list = data.trim().split("\n");
                res.json({result:true, message:"loaded collection", "listLength": list.length});
            /*    for(let n=0;n<list.length;n++) {
                    console.log(list[n]);
                } */
            }
        });
    });
})

app.get('/api/statuslist', (req, res) => {
    logReq(req);
    res.json({message:"status", "listLength": list.length});
})

app.get('/logout', (req, res) => {
    logReq(req);
    req.session.auth="";
    res.redirect('/');
})

// load files into cache, very bad but there are only a few and we need them all :)
loadFile(PageName.loginForm);
loadFile(PageName.app);
loadFile(PageName.appjs);
app.listen(port, () => {
    console.log(`${name} is running on ${port}`);
});

function checkAuth(session) {
    if (session.expire < new Date().getTime()) {
        session.auth="";
        return false;
    }
    if (session.auth=="XY") {
        setExpireAuth(session);
        return true;
    } 
    return false;
}

function getPage(pageName) {
   return pageCache[pageName];
}

function loadFile(pageFileName) {
    fs.readFile(pageFileName, 'utf8', function (err, data) {
        if (err) {
            console.log("Cannot load[" + pageFileName + "] " + err); 
        } else {
            pageCache[pageFileName] = data;
        }
    });
}

function renderTemplate(model, template) {
    let reg = "";
    for (let [key, value] of Object.entries(model)) {
    //    console(`${key} ${value}`);
        reg = new RegExp('{-{' + key + '}-}','m');
        template = template.replace(reg, value);
    }
    return template;
}

function setExpireAuth(session){
   session.expire = (new Date().getTime()) + (3 * 60 * 1000); // 3 hours
}

function logReq(req) {
    let index = "";
    if (req.query.index) {
        index = req.query.index;
    } 
    console.log(req.method + " " + req.path + " " + index);
}

// rolls over if exceeds length
function getInteralIndex(index) {
    index++;
    let reindex = index;
    let len = list.length;
    if (index > len) {
       let mod = Math.ceil(index / len);
       let rem = 0;// index % len; 
       let m = 0;
       if (mod > 1) { m = 1 };
       let X = (len * (mod - m) + rem);
       reindex = reindex - X;
//       console.log("index - (len * (mod - m) + rem) = reindex    X");
//       console.log("" + index + " - (" + len + " * (" + mod + " - m) + " + rem + ") = " + reindex + " " + X);
    }
//    console.log("in index = " + index);
//    console.log("out index =" + reindex);
    reindex--;
//    console.log("returning " + reindex);
    return reindex;
}

function findCollection(callback) {
    let collectionPath = "";  
    let err = "no mounted folders";
    // list folders in mount location
    console.log("Scanning " + mountLocation);
    let file = null;
    let path = null;
    fs.readdir(mountLocation, function(err, items) {
        if (items.length==1) {
            console.log("Checking for collection in " + items[0]);
            path = mountLocation + items[0];
            file = path + "/collection.list";
            console.log("check exists " + file);
            if (fs.existsSync(file)) {
                console.log("exists Y");
                collectionPath = file;
                err=null;
                console.log("calling back with " + collectionPath);
                callback(err, collectionPath);
            } else {
                console.log("exists N");
                err = "Error accessing [" + file + "] for existence";
                console.log("1 error no collection file");
                generateCollection(path, file).then( (error) => {
                    console.log("4 exec promise completed");
                    if (error) {
                        console.log("5 error from attempt");
                        err = "Error generating [" + file + "]";
                    } else {
                        console.log("5 no error from attempt");
                        collectionPath = file;
                        err = null;
                        console.log("calling back with " + collectionPath);
                        callback(err, collectionPath);
                    }
                });
            }
        } else {
            err = "items.length =" + items.length ;
            console.log("failing to calling back with " + err);
            callback(err, collectionPath);
        }
    });
}

async function generateCollection(path, target) {
  console.log("2 about to attempt creation");
  const { stdout, stderr } = await exec('find "' + path + '" -type f -iname "*.jpeg" -o -type f -iname "*.png" -o -type f -iname "*.jpg" -o -type f -iname "*.webp" >> "' + target + '"');

  if (stderr) {
    console.error(`error: ${stderr}`);
  }
  console.log(`Number of files ${stdout}`);
  console.log("3 creation attempt complete");
  return (stderr);
}
