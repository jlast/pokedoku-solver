import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const USER_ACTIVITY_TABLE_NAME = process.env.USER_ACTIVITY_TABLE_NAME ?? '';
const dynamo = new DynamoDBClient({});
const ACTIVITY_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export function validateUserActivityTableConfigured(): boolean {
  return USER_ACTIVITY_TABLE_NAME.length > 0;
}

export async function touchUserActivity(userId: string, now = new Date()): Promise<boolean> {
  if (!validateUserActivityTableConfigured()) {
    return false;
  }

  const currentTimestamp = now.toISOString();
  const cutoffTimestamp = new Date(now.getTime() - ACTIVITY_TOUCH_INTERVAL_MS).toISOString();

  try {
    await dynamo.send(
      new UpdateItemCommand({
        TableName: USER_ACTIVITY_TABLE_NAME,
        Key: marshall({ userId }),
        UpdateExpression: 'SET lastActivityAt = :currentTimestamp',
        ConditionExpression: 'attribute_not_exists(lastActivityAt) OR lastActivityAt < :cutoffTimestamp',
        ExpressionAttributeValues: marshall({
          ':currentTimestamp': currentTimestamp,
          ':cutoffTimestamp': cutoffTimestamp,
        }),
      })
    );

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return false;
    }

    throw error;
  }
}
