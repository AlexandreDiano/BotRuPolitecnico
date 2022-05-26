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
  return `${day}/${month.padStart(2, '0')}`;
}
const currentDateYear = () => {
  const date = new Date();
  const day = String(date.getDate());
  const month = String(date.getMonth() + 1);
  const year = String(date.getFullYear());
  return `${day}/${month.padStart(2, '0')}/${year}`;
}

class Scrapper {
  static results = {cafe: '', almoco: '', janta: '', today: '', data: '', todayDate: '', last: '', awake: 0, err: ''};

  static async init() {
    await Scrapper.getResults();
  }

  static async getResults() {
    const url = 'https://pra.ufpr.br/ru/ru-centro-politecnico/'

    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'domcontentloaded'});

    try {
      await page.waitForSelector('#post div:nth-child(3) figure:nth-child(5) table tbody');

      const pageContent = await page.evaluate(() => {
        return {
          cafe: document.querySelector('#post div:nth-child(3) figure:nth-child(5) table tbody').children[1].innerHTML.replace(/\n|<.*?>/g, '\n'),
          almoco: document.querySelector('#post div:nth-child(3) figure:nth-child(5) table tbody').children[3].innerHTML.replace(/\n|<.*?>/g, '\n'),
          janta: document.querySelector('#post div:nth-child(3) figure:nth-child(5) table tbody').children[5].innerHTML.replace(/\n|<.*?>/g, '\n'),
          data: document.querySelector('#post div:nth-child(3) p:nth-of-type(2) strong strong').innerHTML.replace('eira: ', '').replace(/\s/g, '').replace('/2022', ''),
        }
      })

      Scrapper.results.cafe = pageContent.cafe.replace(/\s\s+/g, '\n');
      Scrapper.results.almoco = pageContent.almoco.replace(/\s\s+/g, '\n');
      Scrapper.results.janta = pageContent.janta.replace(/\s\s+/g, '\n');
      Scrapper.results.data = pageContent.data;
      Scrapper.results.todayDate = currentDate();

      if (Scrapper.results.data === currentDate()) {
        Scrapper.results.today = 'HOJE TEM!';
      } else {
        Scrapper.results.today = 'HOJE NAO TEM!';
      }
    } catch (err) {
      console.log(err)
      Scrapper.results.err = err;
      await this.init();
    }finally{
      await browser.close();
      console.log('getData')
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
    Twitter.init();
    poliBot.post(
      'statuses/update',
      {status: tweetContent},
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
    Scrapper.results.last = "Scrapper"
    await Twitter.init();
    Scrapper.results.last = "Twitter"

    cron.schedule('0 0 5 * * MON-FRI', () => {
      console.log('Get Results')
      if (Scrapper.results.data === currentDate()) {
        try {
          Scrapper.getResults()
          Scrapper.results.last = "Get Results"
        } catch (err) {
          console.log('Get Results ' + err)
        }
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    cron.schedule('0 15 5 * * MON-FRI', () => {
      console.log('Café')
      if (Scrapper.results.data === currentDate()) {
        try {
          Twitter.runTwitter(`---------- ${currentDateYear()} ----------\n------- CAFÉ DA MANHÃ -------\n${Scrapper.results.cafe}`)
          Scrapper.results.last = "Café da Manhã"
        } catch (err) {
          console.log('Café ' + err)
        }
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    cron.schedule('0 30 9 * * MON-FRI', () => {
      console.log('almoço')
      if (Scrapper.results.data === currentDate()) {
        try {
          Twitter.runTwitter(`------- ${currentDateYear()} -------\n--------- ALMOÇO ---------\n${Scrapper.results.almoco}`)
          Scrapper.results.last = "Almoço"
        } catch (err) {
          console.log('Almoço ' + err)
        }
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    cron.schedule('0 30 16 * * MON-FRI', () => {
      console.log('Jantar')
      if (Scrapper.results.data === currentDate()) {
        try {
          Twitter.runTwitter(`------- ${currentDateYear()} -------\n---------- JANTAR ----------\n${Scrapper.results.janta}`)
          Scrapper.results.last = "Janta"
        } catch (err) {
          console.log('Janta ' + err)
        }
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    cron.schedule('0 */10 * * * *', () => {
      console.log('To Acordado.')
      Scrapper.results.awake(Scrapper.results.awake+1)
      Scrapper.herokuApp()
    }, {
      timezone: 'America/Sao_Paulo'
    });
  } catch (err) {
    console.log(err);
  }
}

const app = express();

app.use(cors())

// app.use((req, res) => res.json(Scrapper.results));

app.get("/botfoda", (req, res) => {
  res.status(200).send("Café: " + results.cafe);
  res.status(200).send("Almoço: " + results.almoco);
  res.status(200).send("Janta: " + results.janta);
  res.status(200).send("Today: " + results.today);
  res.status(200).send("Today Date: " + results.todayDate);
  res.status(200).send("Awake: " + results.awake);
  res.status(200).send("Erro: " + results.err);
  res.status(200).send(`<button onClick={init}>Reload</button>`);
});

app.listen(process.env.PORT || 6000, () => {
  console.log('App started at PORT ' + process.env.PORT || 6000)
  init();
})