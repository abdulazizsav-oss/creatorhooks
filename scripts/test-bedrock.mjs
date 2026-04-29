import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-north-1";
const modelId = process.env.BEDROCK_MODEL_ID;
const maxTokens = Number.parseInt(process.env.BEDROCK_MAX_TOKENS ?? "32000", 10);
const prompt =
  process.argv.slice(2).join(" ") ||
  'Верни короткий JSON вида {"ok":true,"provider":"bedrock"}';

if (!modelId) {
  console.error("Missing BEDROCK_MODEL_ID in environment.");
  process.exit(1);
}

if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
  console.error("Missing AWS_BEARER_TOKEN_BEDROCK in environment.");
  process.exit(1);
}

const client = new BedrockRuntimeClient({ region });

try {
  const response = await client.send(
    new ConverseCommand({
      modelId,
      messages: [
        {
          role: "user",
          content: [{ text: prompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: Number.isFinite(maxTokens) ? maxTokens : 32000,
        stopSequences: []
      }
    })
  );

  const text =
    response.output?.message?.content
      ?.map((block) => ("text" in block && typeof block.text === "string" ? block.text : ""))
      .filter(Boolean)
      .join("\n") || "";

  console.log(
    JSON.stringify(
      {
        region,
        modelId,
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens,
        text
      },
      null,
      2
    )
  );
} catch (error) {
  console.error("Bedrock check failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
