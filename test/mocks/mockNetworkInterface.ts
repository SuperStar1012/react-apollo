import {
  NetworkInterface,
  Request,
  SubscriptionNetworkInterface,
} from 'apollo-client/networkInterface';

import {
  GraphQLResult,
  Document,
  print,
} from 'graphql';

// Pass in multiple mocked responses, so that you can test flows that end up
// making multiple queries to the server
export default function mockNetworkInterface(
  ...mockedResponses: MockedResponse[]
): NetworkInterface {
  return new MockNetworkInterface(...mockedResponses);
}

export function mockSubscriptionNetworkInterface(
  mockedSubscriptions: MockedSubscription[], ...mockedResponses: MockedResponse[]
): MockSubscriptionNetworkInterface {
  return new MockSubscriptionNetworkInterface(mockedSubscriptions, ...mockedResponses);
}

export interface ParsedRequest {
  variables?: Object;
  query?: Document;
  debugName?: string;
}

export interface MockedResponse {
  request: ParsedRequest;
  result?: GraphQLResult;
  error?: Error;
  delay?: number;
  newData?: () => any;
}

export interface MockedSubscriptionResult {
  result?: GraphQLResult;
  error?: Error;
  delay?: number;
}

export interface MockedSubscription {
  request: ParsedRequest;
  results?: MockedSubscriptionResult[];
  id?: number;
}

export class MockNetworkInterface implements NetworkInterface {
  private mockedResponsesByKey: { [key: string]: MockedResponse[] } = {};

  constructor(...mockedResponses: MockedResponse[]) {
    mockedResponses.forEach((mockedResponse) => {
      this.addMockedReponse(mockedResponse);
    });
  }

  public addMockedReponse(mockedResponse: MockedResponse) {
    const key = requestToKey(mockedResponse.request);
    let mockedResponses = this.mockedResponsesByKey[key];
    if (!mockedResponses) {
      mockedResponses = [];
      this.mockedResponsesByKey[key] = mockedResponses;
    }
    mockedResponses.push(mockedResponse);
  }

  public query(request: Request) {
    return new Promise((resolve, reject) => {
      const parsedRequest: ParsedRequest = {
        query: request.query,
        variables: request.variables,
        debugName: request.debugName,
      };

      const key = requestToKey(parsedRequest);

      if (!this.mockedResponsesByKey[key]) {
        throw new Error('No more mocked responses for the query: ' + print(request.query));
      }

      const original = [...this.mockedResponsesByKey[key]];
      const { result, error, delay, newData } = this.mockedResponsesByKey[key].shift() || {} as any;

      if (newData) {
        original[0].result = newData();
        this.mockedResponsesByKey[key].push(original[0]);
      }

      if (!result && !error) {
        throw new Error(`Mocked response should contain either result or error: ${key}`);
      }

      setTimeout(() => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }, delay ? delay : 1);
    });
  }
}

export class MockSubscriptionNetworkInterface extends MockNetworkInterface implements SubscriptionNetworkInterface {
  public mockedSubscriptionsByKey: { [key: string ]: MockedSubscription[] } = {};
  public mockedSubscriptionsById: { [id: number]: MockedSubscription} = {};
  public handlersById: {[id: number]: (error: any, result: any) => void} = {};
  public subId: number;

  constructor(mockedSubscriptions: MockedSubscription[], mockedResponses: MockedResponse[]) {
    super(...mockedResponses);
    this.subId = 0;
    mockedSubscriptions.forEach((sub) => {
      this.addMockedSubscription(sub);
    });
  }
  public generateSubscriptionId() {
    const requestId = this.subId;
    this.subId++;
    return requestId;
  }

  public addMockedSubscription(mockedSubscription: MockedSubscription) {
    const key = requestToKey(mockedSubscription.request);
    if (mockedSubscription.id === undefined) {
      mockedSubscription.id = this.generateSubscriptionId();
    }

    let mockedSubs = this.mockedSubscriptionsByKey[key];
    if (!mockedSubs) {
      mockedSubs = [];
      this.mockedSubscriptionsByKey[key] = mockedSubs;
    }
    mockedSubs.push(mockedSubscription);
  }

  public subscribe(request: Request, handler: (error: any, result: any) => void): number {
     const parsedRequest: ParsedRequest = {
        query: request.query,
        variables: request.variables,
        debugName: request.debugName,
      };
    const key = requestToKey(parsedRequest);
    if (this.mockedSubscriptionsByKey.hasOwnProperty(key)) {
      const subscription = this.mockedSubscriptionsByKey[key].shift();
      this.handlersById[subscription.id] = handler;
      this.mockedSubscriptionsById[subscription.id] = subscription;
      return subscription.id;
    } else {
      throw new Error('Network interface does not have subscription associated with this request.');
    }

  };

  public fireResult(id: number) {
    const handler = this.handlersById[id];
    if (this.mockedSubscriptionsById.hasOwnProperty(id.toString())) {
      const subscription = this.mockedSubscriptionsById[id];
      if (subscription.results.length === 0) {
        throw new Error(`No more mocked subscription responses for the query: ` +
        `${print(subscription.request.query)}, variables: ${JSON.stringify(subscription.request.variables)}`);
      }
      const response = subscription.results.shift();
      setTimeout(() => {
        handler(response.error, response.result);
      }, response.delay ? response.delay : 0);
    } else {
      throw new Error('Network interface does not have subscription associated with this id.');
    }
  }

  public unsubscribe(id: number) {
    delete this.mockedSubscriptionsById[id];
  }
}

function requestToKey(request: ParsedRequest): string {
  const queryString = request.query && print(request.query);
  return JSON.stringify({
    variables: request.variables || {},
    debugName: request.debugName,
    query: queryString,
  });
}
