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

  var day = moment().format('DD');
  var sDay = weeeek[moment().format('dddd')];


  //var indexurl = 'http://www.esko-catering.de/cafeteria/essenplan.php';

  function todayIsInSameWeekOf(givenDate) {
    var now = new Date();
    var nowweek = moment(now).isoWeek();
    var givenweek = moment(givenDate).isoWeek();
    return nowweek === givenweek;
  };

  var foodUrl = "http://www.esko-catering.de/kantinen/werkkueche-herweghstrasse.html";

  fetch({
    uri: foodUrl,
    encoding: null
  }, function (error, response, html) {
    var payloadWithCorrectEncoding = iconv.decode(html, 'utf-8');
    if (!error) {
      var $ = cheerio.load(payloadWithCorrectEncoding);
      var row = $('.container.content.card > .row');

      row.children().each(function () {
        var elem = $(this);

        //console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        //console.log(elem); // this bootstrap ('col-lg-6 col-md-6 col-sm-6 col-xs-12')
        elem.children().each(function () {
          var dayHolderDiv = $(this)
          var className = dayHolderDiv.attr('class');

          var sLines = "Hallo, hier ist esko-bot. Heute ist " + sDay + " und wir servieren:\n\n\n";

          if (typeof className != 'undefined' && className.indexOf('day-holder t-left') != -1) {
            dayHolderDiv.children().each(function () {
              var possibleDateNode = $(this);
              var className = possibleDateNode.attr('class');
              if (className === 'date') {
                possibleDateNode.children().each(function () {
                  var possibleSpanNode = $(this);
                  var possibleSpanNodeClassName = possibleSpanNode.attr('class');
                  if (possibleSpanNodeClassName === 'datemonth') {
                    possibleSpanNode.children().each(function () {
                      var possibleDayNode = $(this);
                      var possibleDayNodeClassName = possibleDayNode.attr('class');
                      if (possibleDayNodeClassName === 'daynr') {
                        var parsingDay = parseInt(possibleDayNode.text());
                        var givenday = parseInt(day);
                        if (parsingDay === givenday) {
                          dayHolderDiv.children('.meal').each(function () {
                            var meal = $(this);
                            var s1 = '*' + meal.children('h3').text() + '*';
                            var s3 = meal.children('span[class=price]').text();
                            meal.children('p').each(function () {
                              var possibleP = $(this);
                              if (typeof possibleP.attr('class') === 'undefined') {
                                var s2 = possibleP.text();
                                var mealsStringRep = s1 + ' ' + s2 + ' für ' + s3;
                                //console.log(mealsStringRep);
                                sLines += mealsStringRep + "\n";
                              };
                            });
                          })


                          var payload = {
                            "channel": "rostock",
                            "username": "esko-bot",
                            "text": sLines + "\n\nGuten Appetit!",
                            "icon_emoji": ":knife_fork_plate:"
                          };

                          console.log(payload);
                          return;
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
                      }
                    })
                  }
                })
              }
            });
          }
        })
      });

      //console.log(begin);

      /*
            $('.container.content.card').filter(function (elem) {
              var data = $(this);
              data.children().each(function (i) {
                console.log("Beep");
              });
            }); */
    } else {
      console.log("error: " + error);
    }
  })

  /*
    fetch({
      uri: indexurl,
      encoding: null
    }, function (error, response, html) {
      var bodyWithCorrectEncoding = iconv.decode(html, 'iso-8859-1');
      if (!error) {
        var $ = cheerio.load(bodyWithCorrectEncoding);
        $('.boxEssenplanHolder').filter(function (elem) {
          var data = $(this);
          data.childrenda('.boxEssenplanInfo').each(function (i) {
            var plan = $(this);
            plan.children().each(function (z) { // refactor!
              var node = $(this);
              if (z == 0) {
                var h1 = node.children('h1');
                if (h1.text().indexOf('Herwegh') !== -1) {
                  var dateCluster = h1.parent().parent().children('.boxGerichte').each(function () {
                    $(this).children('p').each(function () {

                      var month = moment().month() + 1;
                      var day = moment().format('DD');
                      var today = new Date();

                      // extract date...
                      var givenDateDay = $(this).text().match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
                      var givenDateMonth = $(this).text().match(/^\d+|\d+\b|\d+(?=\w)/g)[1];
                      var currentYear = moment().format('YYYY');

                      var givenDate = new Date(currentYear + '-' + givenDateMonth + '-' + givenDateDay);

                      if (todayIsInSameWeekOf(givenDate)) {
                        var currentMenuLink = $(this).children('a').attr('href');

                        var week = moment().isoWeek();
                        var numOfDay = moment().day();

                        fetch({
                          uri: 'http://www.esko-catering.de/' + currentMenuLink,
                          encoding: null
                        }, function (error, response, html) {
                          var bodyWithCorrectEncoding = iconv.decode(html, 'iso-8859-1');

                          if (!error) {
                            var $ = cheerio.load(bodyWithCorrectEncoding);

                            $('.boxEssenplanHolder').filter(function () {
                              var data = $(this);
                              var resArray = [];

                              data.children('.boxEssenplanInfo').each(function (i) {
                                var plan = $(this);
                                var day = [];

                                var weekday = plan.children('.boxDatum').children('h1').text();
                                day.push({
                                  'weekday': weekday
                                });

                                var mealNames = [];
                                var prices = [];

                                plan.children('.boxGerichte').each(function (i) {
                                  // we want the content of the paragraphs but w/o the spans inside!!!
                                  var mealName = $(this).children('p').clone().children().remove().end().text().trim();
                                  mealNames.push(mealName);
                                });

                                plan.children('.boxPreis').each(function (i) {
                                  var price = $(this).children('p').text();
                                  prices.push(price);
                                });

                                var meals = [];

                                // re-arrange
                                for (var x = 0; x < mealNames.length; x++) {
                                  meals.push({
                                    'meal': mealNames[x],
                                    'price': prices[x]
                                  });
                                }

                                day.push({
                                  'meals': meals
                                });

                                resArray.push(day);

                              });

                              var load = resArray[numOfDay - 1];
                              var sDay = load[0]['weekday'];
                              var aMeals = load[1]['meals'];

                              var sLines = "Hallo, hier ist esko-bot. Heute ist " + sDay + " und wir servieren:\n\n\n";

                              for (var zz = 0; zz < aMeals.length; zz++) {
                                sLines += aMeals[zz].meal + " für " + aMeals[zz].price + "\n";
                              }

                              sLines += "\nGuten Appetit!";

                              var payload = {
                                "channel": "rostock",
                                "username": "esko-bot",
                                "text": sLines,
                                "icon_emoji": ":hamburger:"
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
                            });
                          }
                        });
                      }
                    });
                  });
                }
              }
            });
          });
        });
      }
    });
    */
  response.render('pages/scrape');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});
