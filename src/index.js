let Twit = require("twit");
let request = require('request')
let cheerio = require('cheerio')

require("dotenv").config();

let food

request('https://pra.ufpr.br/ru/ru-centro-politecnico/', function (err, res, body) {
  if (err) console.log(`Erro: ${err}`)
  let $ = cheerio.load(body)

  $('.wp-block-table table tbody').each(function () {
    food = $(this).find('tr td').text().trim()
  })

  food = food.replace('CAFÉ DA MANHÃ', '|').trim()
  food = food.replace('ALMOÇO', '|').trim()
  food = food.replace('JANTAR', '|').trim()
  food = food.replace('                        ', '\n').trim()
  food = food.replace('                          ', '\n').trim()
  food = food.replace('            ', '\n').trim()
  food = food.replace('                              ', '\n').trim()
  food = food.replace('                                        ', '\n').trim()
  food = food.replace('         ', '\n').trim()
  food = food.replace('                                                ', '\n').trim()
  food = food.split('|')
  currentTime(food);
})

function currentTime(tweet) {
  let date = new Date();
  let hh = date.getHours();
  let mm = date.getMinutes();
  let ss = date.getSeconds();

  const cafe = tweet => {
    runTweet(`---------- ${currentDate} ----------\n------- CAFÉ DA MANHÃ -------\n${tweet[1]}`)
  }

  const almoço = tweet => {
    runTweet(`------- ${currentDate} -------\n--------- ALMOÇO ---------\n${tweet[2]}`)
  }

  const jantar = tweet => {
    runTweet(`------- ${currentDate} -------\n---------- JANTAR ----------\n${tweet[3]}`)
  }

  let currentDate = ('0' + date.getDate()).slice(-2) + '/'
    + ('0' + (date.getMonth()+1)).slice(-2) + '/'
    + date.getFullYear()

  hh = (hh < 10) ? "0" + hh : hh;
  mm = (mm < 10) ? "0" + mm : mm;
  ss = (ss < 10) ? "0" + ss : ss;

  let time = hh + ":" + mm + ":" + ss;
  time.toString()
  if(time === '22:13:30'){
    cafe(tweet)
  }else if(time === '22:13:40'){
    almoço(tweet)
  }else if(time === '22:13:50'){
    jantar(tweet)
  }
  let t = setTimeout(function(){ currentTime(tweet) }, 1000);
}

function runTweet(tweetContent) {

  const poliBot = new Twit({
    consumer_key: process.env.CONSUMER_KEY,

    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,

    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000
  });


  function botPost() {
    let postTweet = `${tweetContent}`;
    poliBot.post(
      'statuses/update',
      {status: postTweet},
      function (err, data, response) {
        if (err) {
          console.log("ERRO: " + err);
          return false;
        }
        console.log("Tweet postado com sucesso!\n");
      }
    )
  }

  botPost();
}
