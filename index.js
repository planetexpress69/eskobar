var express = require('express');
var fetch = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var moment = require('moment');

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
  response.render('pages/index');
});

app.get('/scrape', function (request, response) {

  //var isoWeek = moment().isoWeek();
  //var isoWeekday = moment().isoWeekday;
  //var month = moment().month() + 1;
  var weeeek = {
    "Monday": "Montag",
    "Tuesday": "Dienstag",
    "Wednesday": "Mittwoch",
    "Thursday": "Donnerstag",
    "Friday": "Freitag",
    "Saturday": "Samstag",
    "Sunday": "Sonntag"
  };

  var day = parseInt(moment().format('DD'));
  var sDay = weeeek[moment().format('dddd')];


  //var indexurl = 'http://www.esko-catering.de/cafeteria/essenplan.php';

  function todayIsInSameWeekOf(givenDate) {
    var now = new Date();
    var nowweek = moment(now).isoWeek();
    var givenweek = moment(givenDate).isoWeek();
    return nowweek === givenweek;
  };

  var foodUrl = "http://www.esko-catering.de/kantinen/werkkueche-herweghstrasse.html";
  var foodUrl = "http://www.teambender.de/parsetest.html";

  fetch({
    uri: foodUrl,
    encoding: null
  }, function (error, response, html) {
    var payloadWithCorrectEncoding = iconv.decode(html, 'utf-8');
    if (!error) {
      var $ = cheerio.load(payloadWithCorrectEncoding);
      var sLines = "Hallo, hier ist esko-bot. Heute ist " + sDay + " und wir servieren:\n\n\n";
      $('div.date').each(function (i, element) { // search for the day entries
        var dateNode = $(this);
        var nodeDay = parseInt(dateNode.children('.datemonth').children('.daynr').text());

        if (day === nodeDay) {
          dateNode.parent().children('.meal').each(function (j, elem) {
            var mealNode = $(this);
            sLines += '*' + mealNode.children('h3').text() + '* ' + mealNode.children('p').eq(0).text() + ' für ' + mealNode.children('span.price').text() + "\n";
          });

          var payload = {
            "channel": "rostock",
            "username": "esko-bot",
            "text": sLines + "\n\nGuten Appetit!",
            "icon_emoji": ":knife_fork_plate:"
          };

          fetch({
            url: "https://hooks.slack.com/services/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",
            method: "POST",
            json: true,
            headers: {
              "content-type": "application/json",
            },
            body: payload
          }, function (error, resp, body) {
            if (error) {
              console.log(error);
            } else {
              if (resp.statusCode === 200) {
                console.log("Sending to slack succeeded!");
                res.setHeader('Content-Type', 'text/html');
                res.send('<html><head><meta charset="utf-8"></head><body>Done!\n <pre>' + sLines + '</pre></body></html>');
              } else {
                console.log("Statuscode: " + resp.statusCode);
                res.setHeader('Content-Type', 'text/html');
                res.send('<html><head><meta charset="utf-8"></head><body>Error: ' + resp.statusCode + '\n <pre>' + sLines + '</pre></body></html>');
              }
            }
          });
        }
      });
    } else {
      console.log("error: " + error);
    }
  })
  response.render('pages/scrape');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});
