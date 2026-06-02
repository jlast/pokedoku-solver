import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.COGNITO_REGION;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const USER_ACTIVITY_TABLE_NAME = process.env.USER_ACTIVITY_TABLE_NAME;
const METRIC_NAMESPACE = process.env.METRIC_NAMESPACE ?? "PokedokuHelper/Cognito";

function getRequiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function countUsers(userPoolId: string, region: string): Promise<number> {
  const cognito = new CognitoIdentityProviderClient({ region });
  let totalUsers = 0;
  let paginationToken: string | undefined;

  do {
    const response = await cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 60,
        PaginationToken: paginationToken,
      }),
    );

    totalUsers += response.Users?.length ?? 0;
    paginationToken = response.PaginationToken;
  } while (paginationToken);

  return totalUsers;
}

async function countActiveUsersInWindow(
  dynamo: DynamoDBClient,
  tableName: string,
  now: Date,
  windowMs: number,
): Promise<number> {
  const cutoffTimestamp = new Date(now.getTime() - windowMs).toISOString();
  let totalUsers = 0;
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        Select: "COUNT",
        FilterExpression: "#lastActivityAt >= :cutoffTimestamp",
        ExpressionAttributeNames: {
          "#lastActivityAt": "lastActivityAt",
        },
        ExpressionAttributeValues: {
          ":cutoffTimestamp": { S: cutoffTimestamp },
        },
        ExclusiveStartKey: exclusiveStartKey as Record<string, never> | undefined,
      }),
    );

    totalUsers += response.Count ?? 0;
    exclusiveStartKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);

  return totalUsers;
}

async function getPreviousTotalRegisteredUsers(
  cloudWatch: CloudWatchClient,
  namespace: string,
  userPoolId: string,
  timestamp: Date,
): Promise<number | null> {
  const endTime = new Date(timestamp.getTime() - 60_000);
  const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const response = await cloudWatch.send(
    new GetMetricStatisticsCommand({
      Namespace: namespace,
      MetricName: "TotalRegisteredUsers",
      Dimensions: [{ Name: "UserPoolId", Value: userPoolId }],
      StartTime: startTime,
      EndTime: endTime,
      Period: 24 * 60 * 60,
      Statistics: ["Maximum"],
    }),
  );

  const latestDatapoint = (response.Datapoints ?? [])
    .filter((datapoint): datapoint is NonNullable<typeof datapoint> => Boolean(datapoint.Timestamp))
    .sort((left, right) => right.Timestamp!.getTime() - left.Timestamp!.getTime())[0];

  return latestDatapoint?.Maximum ?? null;
}

export async function handler() {
  const region = getRequiredEnv("COGNITO_REGION", REGION);
  const userPoolId = getRequiredEnv("COGNITO_USER_POOL_ID", USER_POOL_ID);
  const userActivityTableName = getRequiredEnv("USER_ACTIVITY_TABLE_NAME", USER_ACTIVITY_TABLE_NAME);
  const cloudWatchRegion = process.env.AWS_REGION ?? region;
  const cloudWatch = new CloudWatchClient({ region: cloudWatchRegion });
  const dynamo = new DynamoDBClient({ region: cloudWatchRegion });
  const timestamp = new Date();

  const [totalRegisteredUsers, previousTotalRegisteredUsers, activeUsers24h] = await Promise.all([
    countUsers(userPoolId, region),
    getPreviousTotalRegisteredUsers(cloudWatch, METRIC_NAMESPACE, userPoolId, timestamp),
    countActiveUsersInWindow(dynamo, userActivityTableName, timestamp, 24 * 60 * 60 * 1000),
  ]);
  const newUsersDaily = previousTotalRegisteredUsers === null ? 0 : Math.max(totalRegisteredUsers - previousTotalRegisteredUsers, 0);

  await cloudWatch.send(
    new PutMetricDataCommand({
      Namespace: METRIC_NAMESPACE,
      MetricData: [
        {
          MetricName: "TotalRegisteredUsers",
          Dimensions: [{ Name: "UserPoolId", Value: userPoolId }],
          Timestamp: timestamp,
          Unit: "Count",
          Value: totalRegisteredUsers,
        },
        {
          MetricName: "NewUsersDaily",
          Dimensions: [{ Name: "UserPoolId", Value: userPoolId }],
          Timestamp: timestamp,
          Unit: "Count",
          Value: newUsersDaily,
        },
        {
          MetricName: "ActiveUsers24h",
          Dimensions: [{ Name: "UserPoolId", Value: userPoolId }],
          Timestamp: timestamp,
          Unit: "Count",
          Value: activeUsers24h,
        },
      ],
    }),
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      metricNamespace: METRIC_NAMESPACE,
      userPoolId,
      totalRegisteredUsers,
      previousTotalRegisteredUsers,
      newUsersDaily,
      activeUsers24h,
      timestamp: timestamp.toISOString(),
    }),
  };
}
