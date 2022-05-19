const Twit = require("twit");
const puppeteer = require("puppeteer");
const cron = require('node-cron');
const express = require('express');
const cors = require('cors')

require("dotenv").config();

const currentDate = () => {
  const date = new Date();
  const day = String(date.getDate());
  const month = String(date.getMonth() + 1);
  // const year = String(date.getFullYear());
  return `${day}/${month.padStart(2, '0')}}`;
}

class Scrapper {
  static results = {cafe: '', almoco: '', janta: '', today: '', data: '', todayDate: '', err: ''};

  static async init() {
    await Scrapper.getResults();
  }

  static async getResults() {
    try {
      const url = 'https://pra.ufpr.br/ru/ru-centro-politecnico/'
      console.log('getData')
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox']});
      const page = await browser.newPage();
      await page.goto(url,{ waitUntil: 'networkidle2' });

      await page.waitForSelector('#post div:nth-child(3) figure:nth-child(5) table tbody');

      const pageContent = await page.evaluate(() => {
        return {
          cafe: document.querySelector('#post div:nth-child(3) figure:nth-child(5) table tbody').children[1].innerHTML.replace(/\n|<.*?>/g, '\n'),
          almoco: document.querySelector('#post div:nth-child(3) figure:nth-child(5) table tbody').children[3].innerHTML.replace(/\n|<.*?>/g, '\n'),
          janta: document.querySelector('#post div:nth-child(3) figure:nth-child(5) table tbody').children[5].innerHTML.replace(/\n|<.*?>/g, '\n'),
          data: document.querySelector('#post div:nth-child(3) p:nth-of-type(2) strong strong').innerHTML.replace('eira: ', '').replace('/2022: ', '').replace(/\s/g, ''),
        }
      })

      Scrapper.results.cafe = pageContent.cafe.replace(/\s\s+/g, '\n');
      Scrapper.results.almoco = pageContent.almoco.replace(/\s\s+/g, '\n');
      Scrapper.results.janta = pageContent.janta.replace(/\s\s+/g, '\n');
      Scrapper.results.data = pageContent.data;
      Scrapper.results.todayDate = currentDate();

      if (Scrapper.results.data === currentDate()) {
        Scrapper.results.today = 'HOJE TEM!';
      }else{
        Scrapper.results.today = 'HOJE NAO TEM!';
      }

      if(Scrapper.results.cafe || Scrapper.results.almoco || Scrapper.results.janta ){
        await this.init();
      }
      await browser.close();
    } catch (err) {
      console.log(err)
      Scrapper.results.err = err;
      await this.init();
    }
  }

  static async herokuApp() {
    try {
      const heroku = 'https://bot-ru-politecnico.herokuapp.com'
      const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
      const page = await browser.newPage();
      await page.goto(heroku, {waitUntil: 'load', timeout: 0});

      await browser.close();
    } catch (err) {
      console.log(err)
    }
  }
}

let poliBot = '';

class Twitter {
  static async init() {
    poliBot = new Twit({
      consumer_key: process.env.CONSUMER_KEY,

      consumer_secret: process.env.CONSUMER_SECRET,
      access_token: process.env.ACCESS_TOKEN,

      access_token_secret: process.env.ACCESS_TOKEN_SECRET,
      timeout_ms: 60 * 1000
    });
  }

  static runTwitter(tweetContent) {
    let postTweet = `${tweetContent}`;
    Twitter.init();
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
}

async function init() {
  try {
    await Scrapper.init();
    await Twitter.init();

    cron.schedule('0 10 5 * * MON-FRI', () => {
      try {
        Scrapper.herokuApp()
        cron.schedule('0 15 5 * * MON-FRI', () => {
          Scrapper.herokuApp()
          if (Scrapper.results.data === currentDate()) {
            try {
              Twitter.runTwitter(`---------- ${currentDate()} ----------\n------- CAFÉ DA MANHÃ -------\n${Scrapper.results.cafe}`)
            } catch (err) {
              console.log('Café ' + err)
            }
          }
        }, {
          timezone: 'America/Sao_Paulo'
        });
      } catch (err) {
        console.log('5 Minutes early Café ' + err)
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    cron.schedule('0 25 9 * * MON-FRI', () => {
      try {
        Scrapper.herokuApp()
        cron.schedule('0 30 9 * * MON-FRI', () => {
          Scrapper.herokuApp()
          if (Scrapper.results.data === currentDate()) {
            try {
              Twitter.runTwitter(`------- ${currentDate()} -------\n--------- ALMOÇO ---------\n${Scrapper.results.almoco}`)
            } catch (err) {
              console.log('Almoço ' + err)
            }
          }
        }, {
          timezone: 'America/Sao_Paulo'
        });
      } catch (err) {
        console.log('5 Minutes early Almoço ' + err)
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    cron.schedule('0 25 16 * * MON-FRI', () => {
      try {
        Scrapper.herokuApp()
        cron.schedule('0 30 16 * * MON-FRI', () => {
          Scrapper.herokuApp()
          if (Scrapper.results.data === currentDate()) {
            try {
              Twitter.runTwitter(`------- ${currentDate()} -------\n---------- JANTAR ----------\n${Scrapper.results.janta}`)
            } catch (err) {
              console.log('Janta ' + err)
            }
          }
        }, {
          timezone: 'America/Sao_Paulo'
        });
      } catch (err) {
        console.log('5 Minutes early Janta ' + err)
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    cron.schedule('0 54 23 * * MON-FRI', () => {
      try {
        Scrapper.herokuApp()
        cron.schedule('0 59 23 * * MON-FRI', () => {
          Scrapper.herokuApp()
          try {
            Scrapper.getResults()
          } catch (err) {
            console.log('getResults ' + err)
          }
        }, {
          timezone: 'America/Sao_Paulo'
        });
      } catch (err) {
        console.log('5 Minutes early getResults ' + err)
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

  } catch
      (err) {
    console.log(err);
  }
}

const app = express();

app.use(cors())

app.use((req, res) => res.json(Scrapper.results));

app.listen(process.env.PORT || 6000, () => {
  console.log('App started at PORT ' + process.env.PORT || 6000)
  init();
})