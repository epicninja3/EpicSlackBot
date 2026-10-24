require("dotenv").config();
const axios = require("axios");
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

const nasaApi = process.env.NASA_API_KEY;

const currentTime = Math.floor(Date.now() / 1000);
const currTimeString = `<!date^${currentTime}^{time}|${new Date().toISOString()}>`;

//Create a new command with this structure:
app.command("/epicslackbot-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack(); // Make sure you add this at the beginning
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` }); //Use await respond to add text and output
});

app.command("/epicslackbot-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text:
`Available Commands:
/epicslackbot-ping - Check bot latency
/epicslackbot-apod - View today's NASA Astronomy Picture of the Day
/epicslackbot-joke - a joke. lol
/epicslackbot-help - View this menu again with the list of commands
/epicslackbot-weather - View the weather for your city. Make sure you enter your city name
/epicslackbot-spacenews - View upcoming launches and exciting space events
/epicslackbot-calc - Calculate any two numbers with one operator, make sure to include angle bracket around the numbers. Example: /epicslackbot-calc <2>*<2>
/epicslackbot-flip - Flip a coin!
/epicslackbot-roll - Roll any sided dice, simply type a number after the command. Example: /epicslackbot-roll 6 

Important Info: APOD and Weather commands may take a while to load, please be patient.`
  });
});
app.command("/epicslackbot-joke", async ({ ack, respond }) => {
  await ack();

  //Use try and catch for your logic stuff to check for errors
  try {
    // This is the main format for call APIs, make sure to use await axios.get
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



// app.command("/epicslackbot-apod", async ({ ack, command, client }) => {
//   await ack();

//   try {
//     console.log("Fetching NASA APOD...");

//     const response = await axios.get(
//       "https://science.nasa.gov/wp-json/wp/v2/apod-basic/",
//       { params: { api_key: nasaApi } }
//     );

//     console.log("NASA response status:", response.status);
//     console.log("NASA response data:", response.data);

//     const data = Array.isArray(response.data)
//       ? response.data[0]
//       : response.data;

//     if (!data) {
//       throw new Error("NASA returned no APOD data.");
//     }

//     const title = data.title || "NASA APOD";
//     const explanation = (data.explanation || "No explanation available.")
//       .replace(/<[^>]*>/g, "");

//     const blocks = [
//       {
//         type: "header",
//         text: {
//           type: "plain_text",
//           text: `NASA APOD: ${title}`
//         }
//       },
//       {
//         type: "section",
//         text: {
//           type: "mrkdwn",
//           text: explanation
//         }
//       }
//     ];

//     const imageUrl = data.hdurl || data.url;

//     if (data.media_type === "image" && imageUrl) {
//       blocks.push({
//         type: "image",
//         image_url: imageUrl,
//         alt_text: title
//       });
//     } else if (data.url) {
//       blocks.push({
//         type: "section",
//         text: {
//           type: "mrkdwn",
//           text: `<${data.url}|View NASA media>`
//         }
//       });
//     }

//     await client.chat.postMessage({
//       channel: command.channel_id,
//       text: `NASA APOD: ${title}`,
//       blocks
//     });

//     console.log("APOD message sent successfully.");

//   } catch (err) {
//     console.error(
//       "APOD error:",
//       err.data || err.response?.data || err.message
//     );
//   }
// });


app.command("/epicslackbot-apod", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get(`https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=${nasaApi}`);
    // const data = response.data;
    
    //const response = await axios.get(`https://science.nasa.gov${nasaApi}`);
    const data = response.data && response.data[0] ? response.data[0] : null;
    
    const explanationB = data.explanation.replace(/<[^>]*>/g, ''); // removing the weird HTML formatting 

    if (data.media_type !== "image"){
      await respond({
        text: `Today's NASA Astronomy Picture of the day: ${data.title}\n Today's APOD is a video, click the link below to view it: \n${data.url}\n\n${explanationB}`
      })
    }

    // await respond({
    //   text: `Today's NASA Astronomy Picture of the Day: ${data.title}\n${data.hdurl}\n\n${data.explanation}`
    // });

    // This is a thing called Slack Blocks, search it up for the proper formatting depending on your use case
    else{
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
    }
    

  } catch (err) {
    console.error("APOD error:", err.response?.status, err.response?.data || err.message);
    await respond({text: "Failed to fetch APOD." });
  }
});



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

    const tempC = Math.round((temperature - 32) * (5/9));
    const highC = Math.round((high - 32) * (5/9));
    const lowC = Math.round((low - 32) * (5/9));
  await client.chat.postMessage({
    channel: channelId, //Basically tells the bot which channel you should message in
    text: 
    `
*Weather Brief - ${city}*

*🌡️Current Temperature:* ${temperature}°F (${tempC}°C)
*Today's High:* ${high}°F (${highC}°C)
*Today's Low:* ${low}°F (${lowC}°C)

*🌧️Chance of Precipitation:* ${perceptprob}%
*Chance of Precipiation Tomorrow:* ${perceptprobtmr}%

*💨Windspeed:* ${windspeed} mph
*Sunrise:* ${sunrise}
*Sunset:* ${sunset} 
    `

  });
  } catch (err) {
    console.error("Failed to process city input:", err);
  }
});

app.command("/epicslackbot-spacenews", async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const launchResponse = await axios.get("https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=3");
    const launchData = launchResponse.data.results;
    const eventResponse = await axios.get("https://ll.thespacedevs.com/2.3.0/events/upcoming/?limit=3");
    const eventData = eventResponse.data.results;

    //Map through the objects and extract the readable fields
    const formattedLaunches = launchData.map(launch => {
    launch.net = new Date(launch.net)
    const padName = launch.pad ? launch.pad.name : "Unknown Pad";
    
    return `🚀 *${launch.name}* \nLaunch Pad: ${padName}\n📅 Date: ${launch.net}\nℹ️ Status: ${launch.status.name}\n`;
    }).join("\n"); //join them at each \n

    const formattedEvents = eventData.map(events => {
      events.date = new Date(events.date)
      return `🚀 *${events.name}*\n📅 Date: ${events.date}\n`;
    }).join("\n"); //join them at each \n
    await respond({
      text: 
`*Upcoming Launches*: \n
${formattedLaunches}\n\n 
*Events*: \n
${formattedEvents}`
    })
  } catch (err) {
    console.error("Failed to show space news:", err);
  }
});


//Most likely not going to use this.
app.command("/epicslackbot-reminder", async ({ command, ack, respond }) => {
  await ack();



  try {
    const userParam = command.text ? command.text.trim() : ''; // Strip the text written after typing out the command

    if (!userParam) {
      await respond({
        text: "You didn't provide any text."     
      });
      return;
    }
    let remind= "";
    const cleanTimeParam = userParam.replace(/^<|>/g, '');
    
    
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime === cleanParam){
      remind = `Here is your reminder for ${cleanTimeParam}`;
      text: `${remind}`;
    }

    const currTimeString = `<!date^${currentTime}^{time}|${new Date().toISOString()}>`;
    await respond({
      text: `Typed: ${cleanParam}
      Time: ${currTimeString}`

    });
    
  } catch (err) {
    console.error("Failed to show space news:", err);
  }
});

app.command("/epicslackbot-calc", async ({ command, ack, respond}) => {
  await ack();

  //Set variables for each operator
  const mult = "*";
  const div = "/";
  const add = "+";
  const sub = "-";
  const exp = "^";
  let result = 0;

  try{
    const calcParam = command.text ? command.text.trim() : ''; // Removes all text after typing the command
    // const calcCleanParam = calcParam.replace(/^<|>/g, '');
    const equation = calcParam.replace(/<|>/g, '');
    const matches = calcParam.match(/<([^>]+)>/g); //Takes the numbers that are in between the numbers

    const num1 = matches[0].replace(/[<>]/g, '');
    const num2 = matches[1].replace(/[<>]/g, '');

    // Does the correct operation according to the input provided
    if (calcParam.includes(mult)){
      result = num1*num2;
    } else if (calcParam.includes(div)){
      // Check for dividing by 0, because that doesn't work. 
      if (num2 === 0){
        result = "Error: Can't divide by 0";
      }
      else {
        result = num1/num2;
      }
    } else if (calcParam.includes(add)){
      result = num1+num2;
    } else if (calcParam.includes(sub)){
      result = num1-num2;
    } else if (calcParam.includes(exp)){
      result = num1 ** num2;
    }

    await respond ({
      text: 
`${equation}
Result: ${result}`
    });
    
  } catch (err) {
    console.error("Failed to get a result");
  }
});

app.command("/epicslackbot-roll", async ({ command, ack, respond}) => {
  await ack();
  
  try{
    const numInput = command.text ? command.text.trim() : '';
    const fNumInput = numInput.replace(/^<|>/g, '');
    const rollNum = Math.floor(Math.random() * (Number(fNumInput)) + 1)
    
    await respond ({
      text: `Rolling a ${fNumInput}-sided dice!\n\n*Result: ${rollNum}*`
    });
    
  } catch (err) {
    console.error("Failed to get a result");
  }
});

app.command("/epicslackbot-flip", async ({ command, ack, respond}) => {
  await ack();
  
  try{
    const result = Math.random() <= 0.5 ? 'Heads' : 'Tails';
    await respond ({
      text: `Flipping a coin!\nResult: ${result}`
    });
    
  } catch (err) {
    console.error("Failed to get a result");
  }
});

app.command("/epicslackbot-trivia", async ({ command, ack, respond}) =>{
  await ack();
  // const triviaResponse = await axios.get("https://opentdb.com/api.php?amount=1&difficulty=easy");
  const triviaResponse = await axios.get("https://the-trivia-api.com/v2/questions?difficulties=easy&limit=1");
  const triviaData = triviaResponse.data;
  try{
    const formattedTrivia = triviaData.map((trivia) => {
      const triviaQ = trivia.question.text;
      const correctAns = trivia.correctAnswer;
      const incorrectAns = trivia.incorrectAnswers;
      let allAns = [...trivia.incorrectAnswers, correctAns];

      // Shuffling the answer choices using the Fisher-Yates shuffle - search it up
      for (let i = allAns.length - 1; i > 0; i--){ // Use a for loop to iterate through the array 
        const j = Math.floor(Math.random() * (i + 1)); // Choose a random index from 0 to i

        [allAns[i], allAns[j]] = [allAns[j], allAns[i]]; // Swaps the values of j and i
        // let randomChoice = allAns[Math.floor(Math.random() * allAns.length())];
      }

      

      const incorrect1 = trivia.incorrectAnswers[0];
      const incorrect2 = trivia.incorrectAnswers[1];
      const incorrect3 = trivia.incorrectAnswers[2];
      return {
        testText: `${triviaQ}\n${correctAns}\n ${incorrect1}\n ${incorrect2}\n ${incorrect3}`,
        question: `${triviaQ}`,
        options: allAns
      };
      

    });
    
    const allOptions = formattedTrivia[0].options;
    const option1 = allOptions[0];
    const option2 = allOptions[1];
    const option3 = allOptions[2];
    const option4 = allOptions[3];
    await respond({
      
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `Question: ${formattedTrivia[0].question}`
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": `${option1}`
              },
              "style": "primary",
              "action_id": "approve_click", // Unique identifier
              "value": "item_123"           // Contextual data passed to your backend
            },
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": `${option2}`
              },
              "style": "primary",
              "action_id": `option`,    // Unique identifier
              "value": "item_123"
            }
          ]
        }
      ]
      
    });



  } catch (err){
    console.log("Not working");
  }
    
  
});


(async () => {
  await app.start();
  console.log("bot is running!");
})();