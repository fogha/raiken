import Util from './utils.js';

Util.doSomething();  // Outputs: Doing something
Util.doSomethingElse();  // Outputs: Doing something else
Util.anotherFunction();  // Outputs: Another function
const props={};

const parties = useMemo(
  () =>
  ("parties" in props && Array.isArray(props.parties)
    ? props.parties
    : []
  ).filter(
    (
      party
    ): party is {
      answersString: string;
      abbreviation: string;
      name: string;
    } =>
      typeof party.name === "string" &&
      typeof party.answersString === "string" &&
      typeof party.abbreviation === "string"
  ),
  [props.parties]
);
