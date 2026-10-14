require("dotenv").config();
const axios = require("axios");
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

const nasaApi = process.env.NASA_API_KEY;

app.command("/epicslackbot-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

app.command("/epicslackbot-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text:
`Available Commands:
/epicslackbot-ping - Check bot latency
/epicslackbot-apod - View today's NASA Astronomy Picture of the Day
/epicslackbot-joke - a joke. lol
/epicslackbot-help - View this menu again with the list of commands`
  });
});
app.command("/epicslackbot-joke", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
    await respond({
      text:
`${response.data.setup}

${response.data.punchline}`
    });
  } catch (err) {
    await respond({ text: "Failed to fetch a joke." });
  }
});

app.command("/epicslackbot-apod", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get(`https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=${nasaApi}`);
    // const data = response.data;
    
    //const response = await axios.get(`https://science.nasa.gov${nasaApi}`);
    const data = response.data && response.data[0] ? response.data[0] : null;
    
    const explanationB = data.explanation.replace(/<[^>]*>/g, '');

    if (data.media_type !== "image"){
      return await respond({
        text: `Today's NASA Astronomy Picture of the Day ${data.title}\n${data.hdurl}\n\n${data.explanation}`
      });
    }

    // await respond({
    //   text: `Today's NASA Astronomy Picture of the Day: ${data.title}\n${data.hdurl}\n\n${data.explanation}`
    // });

    await respond({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Today's NASA Astronomy Picture of the Day: ${data.title}`,
            
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${explanationB}`
          }
        },
        {
          type: "image",
          image_url: data.hdurl,
          alt_text: data.title
        }
      ],
      text: `Today's NASA Astronomy Picture of the Day: ${data.title}` 
    });

  } catch (err) {
    await respond({text: "Failed to fetch APOD." });
  }
});


// app.command("/epicslackbot-weather", async ({ ack, respond }) => {
//   await ack();
//   // const weatherUrl =
//   //       `https://api.open-meteo.com/v1/forecast?` +
//   //       `latitude=${lat}` +
//   //       `&longitude=${lon}` +
//   //       `&current=temperature_2m,wind_speed_10m,is_day,wind_direction_10m,precipitation,rain,showers,snowfall,cloud_cover,weather_code` +
//   //       `&temperature_unit=fahrenheit` +
//   //       `&wind_speed_unit=mph` +
//   //       `&timezone=auto` +
//   //       `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code` +
//   //       `&models=ecmwf_ifs`;
//   try {
//     const response = await axios.get(`${weatherUrl}`);
//     const result = await client.view.open({
//       trigger_id: isRawBodyError.trigger_id,
//       view: {
//         type: 'modal',
//         callback_id: 'modal-identifier',
//         title: {
//           type: 'plain_text',
//           text: "User Input request"
//         },
//         blocks: [
//           {
//             type: 'input',
//             block_id: 'input_block_1',
//             element: {
//               type: 'plain_text_input',
//               action_id: 'plain_text_input-action',
//               placeholder: {
//                 type: 'plain_text',
//                 text: 'Enter your city...'
//               }
//             },
//             label: {
//               type: 'plain_text',
//               text: 'Please enter your city...'
//             }
//           }
//         ],
//         submit: {
//           type: 'plain_text',
//           text: 'Submit'
//         }
//       }
//     });
//   } catch (err) {
//     await respond({text: "Failed to get input"});
//   }
// });
// app.view('user_input_modal', async ({ack, body, view, client }) => {
//   await ack();

//   const userInput = view.state.values.feedback_block.feedback_input.value;
//   const userWhoSubmitted = body.user.id;
  
//   await respond({
//     text: 
//     `User input: ${userInput}`
//   });

// });

app.command("/epicslackbot-weather", async ({ command, ack, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal", //this is a modal, used to make buttons and input stuff
        callback_id: "user_input_modal",
        private_metadata: command.channel_id, //This puts the response back into the same channel

        title: {
          type: "plain_text", //title of the modal
          text: "City Lookup"
        },
        submit: {
          type: "plain_text",
          text: "Get Weather"
        },
        close: {
          type: "plain_text",
          text: "Cancel"
        },
        blocks: [
          {
            type: "input", //all the input config
            block_id: "input_block_1",
            element: {
              type: "plain_text_input",
              action_id: "city_input",
              placeholder: {
                type: "plain_text",
                text: "Enter a city, e.g. Austin, TX"
              }
            },
            label: {
              type: "plain_text",
              text: "City"
            }
          }
        ]
      }
    });
  } catch (err) {
    console.error("Failed to open weather modal:", err);
  }
});

// Use this to get back the data from the input 
app.view("user_input_modal", async ({ ack, view, client }) => {
  await ack();

  try {
    const city = view.state.values.input_block_1.city_input.value; // This stores the value of the input into this variable
    const channelId = view.private_metadata; // This is the channel ID so the bot can report back to the same channel
    const response = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=en&format=json`);
    const geoResult = response.data.results;
    if (!geoResult || geoResult.length === 0) {
      throw new Error("City not found");
    }
    const city1 = geoResult[0];

    const latitude = city1.latitude;
    const longitude = city1.longitude;
    
    
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,wind_speed_10m,is_day,wind_direction_10m,precipitation,rain,showers,snowfall,cloud_cover,weather_code` +
      `&temperature_unit=fahrenheit` +
      `&wind_speed_unit=mph` +
      `&timezone=auto` +
      `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code` +
      `&models=ecmwf_ifs`;
    const weatherResponse = await axios.get(weatherUrl);
    const weatherData = weatherResponse.data;

    const sunrise = weatherData.daily.sunrise[0].split("T")[1];
    const sunset = weatherData.daily.sunset[0].split("T")[1];
    const temperature = weatherData.current.temperature_2m;
    const windspeed = weatherData.current.wind_speed_10m;
    const high = weatherData.daily.temperature_2m_max[0];
    const low = weatherData.daily.temperature_2m_min[0];
    const winddirect = weatherData.current.wind_direction_10m;
    const perceptprob = weatherData.daily.precipitation_probability_max[0];
    const perceptprobtmr = weatherData.daily.precipitation_probability_max[1];
    const rainsum = weatherData.daily.precipitation_sum[0];
    // let day = "";
    // let dayhigh = 0;
    // const codeb = weatherData.current.weather_code;
    // const isDay = weatherData.current.is_day;
    // const iconb = weatherIcon(codeb, isDay);
    // const localTime = new Date().toLocaleTimeString("en-US", {
    //   timeZone: weatherData.timezone,
    //   hour: "numeric",
    //   minute: "2-digit",
    //   hour12: true
    // });
  await client.chat.postMessage({
    channel: channelId, //Basically tells the bot which channel you should message in
    text: 
    `
    Weather Brief - ${city}
    
    Current Temperature: ${temperature} °F
    Today's High: ${high} °F
    Today's Low: ${low} °F

    Chance of Precipitation: ${perceptprob}
    Chance of Precipiation Tomorrow: ${perceptprobtmr}
    
    Windspeed: ${windspeed}
    Sunrise: ${sunrise}
    Sunset: ${sunset}
    `

  });
  } catch (err) {
    console.error("Failed to process city input:", err);
  }
});

app.command("/epicslackbot-martianweather", async ({ ack, respond }) => {
  await ack();
  await respond({
    text:
`Available Commands:
/epicslackbot-ping - Check bot latency
/epicslackbot-apod - View today's NASA Astronomy Picture of the Day
/epicslackbot-joke - a joke. lol
/epicslackbot-help - View this menu again with the list of commands`
  });
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();