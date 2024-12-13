import express, { Request, Response } from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { ethers } from "ethers";
import {
  createZGServingNetworkBroker,
  ZGServingNetworkBroker,
  ServiceStructOutput,
} from "@0glabs/0g-serving-broker";

dotenv.config();

const PORT = 3000;
const privateKey = process.env.PRIVATE_KEY || "";
const SERVICE_NAME = "chat-provider-1";

let openai = new OpenAI({ apiKey: "" });

const app = express();
let broker: ZGServingNetworkBroker;
let service: ServiceStructOutput;

async function init0g() {
  const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");

  // Step 1: Create a wallet with a private key
  const wallet = new ethers.Wallet(privateKey, provider);

  // Step 2: Initialize the broker
  try {
    broker = await createZGServingNetworkBroker(wallet);

    // Step 3: List available services
    console.log("Listing available services...");
    const services = await broker.listService();
    services.forEach((service: any) => {
      console.log(
        `Service: ${service.name}, Provider: ${service.provider}, Type: ${service.serviceType}, Model: ${service.model}, URL: ${service.url}`
      );
    });

    // Step 3.1: Select a service
    const foundService = services.find(
      (service: any) => service.name === SERVICE_NAME
    );
    if (!foundService) {
      console.error("Service not found.");
      return;
    }
    service = foundService;
    const providerAddress = service.provider;

    // Step 4: Manage Accounts
    const initialBalance = 0.00000001;
    // Step 4.1: Create a new account
    try {
      console.log("Creating a new account...");
      await broker.addAccount(providerAddress, initialBalance);
      console.log("Account created successfully.");
    } catch (error) {
      // account already exists.
      console.log(error);
    }

    // Step 4.2: Deposit funds into the account
    // const depositAmount = 0.00000002;
    // console.log("Depositing funds...");
    // await broker.depositFund(providerAddress, depositAmount);
    // console.log("Funds deposited successfully.");

    // Step 4.3: Get the account
    const account = await broker.getAccount(providerAddress);
    console.log(account);
  } catch (error) {
    console.error("Error during execution:", error);
  }
}

async function startServer() {
  await init0g();

  app.listen(PORT, () => {
    console.log("server running");
  });
}

startServer();

app.get("/chat", async (req: Request, res: Response) => {
  const providerAddress = service.provider;

  // Step 5: Use the Provider's Services
  console.log("Processing a request...");
  const serviceName = service.name;
  const content = String(req.query.q) || "What is the capital of Germany?";

  // Step 5.1: Get the request metadata
  const { endpoint, model } = await broker.getServiceMetadata(
    providerAddress,
    serviceName
  );

  // Step 5.2: Get the request headers
  console.log("fetching headers");
  const headers = await broker.getRequestHeaders(
    providerAddress,
    serviceName,
    content
  );

  // Step 6: Send a request to the service
  openai = new OpenAI({
    baseURL: endpoint,
    apiKey: "",
  });
  let completion = undefined;
  try {
    completion = await openai.chat.completions.create(
      {
        messages: [{ role: "system", content }],
        model: model,
      },
      {
        headers: {
          ...headers,
        },
      }
    );
  } catch (error: any) {
    const regex = /(?<=expected\s)([0-9.]+)/;
    const match = error.error.match(regex);
    if (match) {
      // need to manually settle fees.
      const feeToPay: number = Number(match[1]);
      console.log(`need to settle ${feeToPay} A0GI`);
      try {
        await broker.settleFee(providerAddress, serviceName, feeToPay);
        console.log("fee settled!");
      } catch (error) {
        console.log("unable to settle fee", error);
      }
    }
  } finally {
    console.log("finally", completion);
    // completion is undefined if there was an error with fees to settle.
    if (completion === undefined) {
      completion = await openai.chat.completions.create(
        {
          messages: [{ role: "system", content }],
          model: model,
        },
        {
          headers: {
            ...headers,
          },
        }
      );
    }
  }

  const receivedContent = completion.choices[0].message.content;
  const chatID = completion.id;
  if (!receivedContent) {
    throw new Error("No content received.");
  }
  console.log("Response:", receivedContent);

  // Step 7: Process the response
  console.log("Processing a response...");
  const isValid = await broker.processResponse(
    providerAddress,
    serviceName,
    receivedContent,
    chatID
  );
  console.log(`Response validity: ${isValid ? "Valid" : "Invalid"}`);

  console.log("data from response", completion.choices[0].message.content);

  res.send(completion.choices[0].message.content);
});
