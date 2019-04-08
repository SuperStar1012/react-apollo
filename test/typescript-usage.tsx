// this file tests compilation of typescript types to ensure compatibility
// we intentionally don't enforce TS compilation on the rest of the tests so we can
// test things like improper argument calling / etc to cause errors and ensure
// that they are handled
import * as React from 'react';
import gql from 'graphql-tag';
import { graphql, DataValue } from '../src';
import { ChildProps } from '../src';

const historyQuery = gql`
  query history($solutionId: String) {
    history(solutionId: $solutionId) {
      solutionId
      delta
    }
  }
`;

// const historyMutation = gql`
//   mutation updateHistory($input: updateHistoryMutation) {
//     updateHistory(input: $input) {
//       solutionId
//       delta
//     }
//   }
// `;

interface Data {
  history: [
    {
      solutionId: string;
      delta: number;
    }
  ];
}

// interface Mutation {
//   updateHistory?: MutationFn<MutationPayload, MutationInput>;
// }
//
// interface MutationPayload {
//   updateHistory: Record<any, any>[];
// }
//
// interface MutationInput {
//   input: {
//     id: string;
//     newDelta: string;
//   };
// }

interface Props {
  solutionId: string;
}

// --------------------------
// standard wrapping
const withHistory = graphql<Props, Data>(historyQuery, {
  options: ownProps => ({
    variables: {
      solutionId: ownProps.solutionId,
    },
  }),
});

class HistoryView extends React.Component<ChildProps<Props, Data>> {
  render() {
    if (this.props.data && this.props.data.history && this.props.data.history.length > 0) {
      return <div>yay type checking works</div>;
    } else {
      return null;
    }
  }
}

const HistoryViewWithData = withHistory(HistoryView);
<HistoryViewWithData solutionId="foo" />;

// --------------------------
// stateless function with data
const HistoryViewSFC = graphql<Props, Data>(historyQuery, {
  options: ownProps => ({
    variables: {
      solutionId: ownProps.solutionId,
    },
  }),
})(props => {
  if (props.data && props.data.history && props.data.history.length > 0) {
    return <div>yay type checking works</div>;
  } else {
    return null;
  }
});

<HistoryViewSFC solutionId="foo" />;

// --------------------------
// decorator
@graphql<Props, Data>(historyQuery)
class DecoratedHistoryView extends React.Component<ChildProps<Props, Data>> {
  render(): React.ReactNode {
    if (this.props.data && this.props.data.history && this.props.data.history.length > 0) {
      return <div>yay type checking works</div>;
    } else {
      return null;
    }
  }
}

<DecoratedHistoryView solutionId="foo" />;

// --------------------------
// with custom props
const withProps = graphql<Props, Data, {}, { organisationData: DataValue<Data> | undefined }>(
  historyQuery,
  {
    props: ({ data }) => ({
      organisationData: data,
    }),
  },
);

const Foo = withProps(props => <div>Woot {props.organisationData!.history}</div>);

<Foo solutionId="foo" />;

// --------------------------
// variables with simple custom props
interface Variables {
  solutionId: string;
}

const simpleVarsAndProps = graphql<Props, Data, Variables>(historyQuery, {
  options: ({ solutionId }) => ({
    variables: { solutionId },
  }),
  props: data => data,
});

const HistorySimpleVarsAndProps = simpleVarsAndProps(props => <div>{props.data!.history}</div>);

<HistorySimpleVarsAndProps solutionId="foo" />;

// --------------------------
// variables with advanced custom props
type FlatProps = Props & Partial<DataValue<Data, Variables>>;

const advancedVarsAndProps = graphql<Props, Data, Variables, FlatProps>(historyQuery, {
  options: ({ solutionId }) => ({
    variables: { solutionId },
  }),
  props: ({ data, ownProps }) => ({ ...data, ...ownProps }),
});

const HistoryAdvancedVarsAndProps = advancedVarsAndProps(props => <div>{props.history}</div>);

<HistoryAdvancedVarsAndProps solutionId="foo" />;
