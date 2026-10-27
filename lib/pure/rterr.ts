// Go runtime errors in plain TypeScript. An operation that fails with one (a
// nil dereference, an index out of range, a write to a nil map, a failed
// type assertion, a division by zero) evaluates to rterr<message>, the
// message as Go's without "runtime error: ". go2types checks the result of
// every such operation (rtok) and makes a failure an ordinary Go panic of the
// enclosing function, with the heap as it is then (its G_rtp), which
// deferred calls can recover from like any other.
/** @native rterr */
export type rterr<Msg> = rterr_c<Msg extends string ? Msg : never>;
type rterr_c<Msg extends string> = { tstst_rterr: Msg };
// (X is the target of the relation, not its source: a relation from a tuple
// gets a key that walks all the tuple's type arguments in tsc and tsgo
// (isTypeReferenceWithGenericArguments), which for the heap, and results
// holding it, is every node of the trie. never is not ok, as before.)
/** @native rtok */
export type rtok<X> =
  [X extends unknown ? true : never] extends [never] ? false
  : [AnyRterr] extends [X] ? false : true;
type AnyRterr = { tstst_rterr: never };
// the text of the Go value (a runtime.Error) of a failure
export type rtmsg<X> =
  X extends { tstst_rterr: infer M extends string }
    ? M extends `interface conversion${string}` | `assignment to entry${string}` ? M : `runtime error: ${M}`
    : never;
