import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.COGNITO_REGION;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
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
  const cloudWatchRegion = process.env.AWS_REGION ?? region;
  const cloudWatch = new CloudWatchClient({ region: cloudWatchRegion });
  const timestamp = new Date();

  const totalRegisteredUsers = await countUsers(userPoolId, region);
  const previousTotalRegisteredUsers = await getPreviousTotalRegisteredUsers(
    cloudWatch,
    METRIC_NAMESPACE,
    userPoolId,
    timestamp,
  );
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
      timestamp: timestamp.toISOString(),
    }),
  };
}
