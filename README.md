# 0gchat

## Dev Setup

Clone this repo:

```bash
git clone https://github.com/jhuang314/0gchat.git

cd 0gchat
```

Create a `.env` file in the current repo. Change `<your 0g wallet private key>` to your 0g wallet's private key.

```bash
touch .env
echo 'PRIVATE_KEY=<your 0g wallet private key>' >> .env
```

Afterwards, run the following:

```bash
npm install
npm run dev
```

The app should be running on port 3000.

To run a query against the LLM, set the query params: `https://localhost:3000/chat?q=<your query here>`


## How does this work?

This project uses Nodejs + Express to serve up a `GET /chat` api that allows users to ask an LLM from a 0g provider.

This utilizes the [0g TypeScript SDK ](https://docs.0g.ai/build-with-0g/compute-network/sdk) to

 - setup a broker
 - fetch a list of provider services
 - deposit funds to an account
 - fetch request headers for a specific service
 - call the provider's OpenAI compatible chat api
 - *verify* the integrity of the response and pay the provider

 The server also handles race conditions, and can settle fees automatically.

## Roadmap

There are many applications for verifyable LLM API's:

 - Mental Health bots
 - Trading bots

 These require API's that are resistant to tampering attacks, which 0g is the perfect solution for since it ensures the integrity of
 the results.

Potential next steps are to build out a Frontend that uses this API, and customize the agents for specific use cases.
