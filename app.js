/* jshint node : true */
"use strict";

const
      express = require("express"),
      app = express(),
      path = require("path"),
      axios = require("axios"),
      redis = require('redis'),
      util = require('util');

//!   FIXER api
const API_URL = 'http://data.fixer.io/api/',
      ACCESS_KEY = 'access_key=7e86e0081e3b8e76d0c612ae9b492346';


//!   REDIS
//? node_redis: WARNING: You passed "http" as protocol instead of the "redis" protocol!
const REDIS_URL = "redis://127.0.0.1", //ie localhost
      REDIS_PORT = "6379",
      redisClient = redis.createClient(`${REDIS_URL}:${REDIS_PORT}`);

// console.log(redisClient);

redisClient.on('connect', () => {
      console.log("\n--- connected to REDIS ---");
});

redisClient.on('reconnecting', (obj) => {
      console.log("\n--- ** reconnecting **  to REDIS ---");
      console.log(` delay :  ${obj.delay}      attempt : ${obj.attempt}`);
});

redisClient.on('error', err => {
      console.log("\n--- ERROR : while connecting to REDIS ---");
      console.log(err);
});

redisClient.on('end', () => {
      console.log("\n--- ** END connection ** with  REDIS ---");
});




app.get("/", (req, res) => {
      // res.sendFile("./views/index.html"); //? --> see why ERROR

      //! Path either should be absolute . . .  OR  . . .  specify root to res.sendFile
      // res.sendFile('/Users/prashant/Desktop/exchange rate app/views/index.html');

      console.log(__dirname);
      console.log(path.dirname(__filename));

      res.sendFile("index.html", {
            root: path.join(__dirname, 'views')
      });
});


app.get('/rate/:date', (req, res) => {
      console.log("hit ");

      let date = req.params.date;
      const url = `${API_URL}/${date}?${ACCESS_KEY}&symbols=EUR,USD,AUD,CAD,PLN,MXN,AFN,ALL,DZD,EUR,AOA,ARS,AMD,AWG,AUD,EUR,AZN,BHD,BDT,BBD,BYN,EUR,BZD,EAO,BMD,INR,BTN,IUS,BWP,BRL,BGN,BIF,KHR,EAC,CAD,EAC,CLP,CNY,COP,LIC,CFA,CFA,HRK,CUP,CUC,DKK,DJF,EGP`;

      const countKey = `USD:${date}:count`;
      const ratesKey = `USD:${date}:rates`;

      redisClient.incr(countKey, (err, count) => {
            if (err) {
                  console.error(err);
                  res.send({
                        err
                  });
            }
            redisClient.hgetall(ratesKey, (err, rates) => {
                  if (rates) { // is if its not empty list
                        return res.json({
                              rates,
                              count // this count is from above,that we got from the incr function on countkey
                        });
                  }

                  //if empty then first get the data & then store it in the redis server
                  axios.get(url)
                        .then(response => {
                              // console.log(util.inspect(response));
                              // console.log(response);     //* same thing as above

                              console.log(`response.data.success   ${response.data.success} `);
                              if (response.data.success) {
                                    console.log(`Got data :\n${JSON.stringify(response.data.rates, null, 4)} \n\n`);

                                    //! save this into redis
                                    redisClient.hmset(ratesKey, response.data.rates);
                                    return res.json({
                                          rates: response.data.rates,
                                          count
                                    });
                              } else {
                                    console.log("ERROR : In requesting API    :  response.data.success  FALSE ");
                                    console.log(JSON.stringify(response.data.error, null, 4));
                                    return res.json({
                                          rates: [],
                                          count: -1
                                    });
                              }
                        })
                        // .catch(err => console.log(`ERROR in get request  : \n ${err}`));
                        .catch(error => {
                              console.log(error);
                              res.json(error);
                        });
                  /*
                  similar to above statment
                        .catch(error => {
                              return res.json(error.response.data)
                        });
                  */
            });
      });
});


const port = 4000;
app.listen(port, () => {
      console.log(`APP on port :  ${port} `);
});