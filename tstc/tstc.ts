// tstc, written in type-level TypeScript: Main<Source> is the LLVM IR of the
// type-level program Source, for tstc's runtime (libtstcrt.a): every alias a
// function of its frame (memoized by its arguments), conditionals decided by
// the runtime (rt_cond, with the infer patterns of their extends types), the
// other types made by the runtime's constructors.
//
// It compiles itself: built once by the MoonBit tstc, it compiles this file
// to IR, and the compiler that IR makes compiles this file to the same IR.

// ---------------------------------------------------------------------------
// Lexer: tokens [kind, text]; kind "id", "num", "str", "tpl_full",
// "tpl_start", "tpl_mid", "tpl_end" or the punctuation. St: the braces open,
// 1 for a template's `${`.

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Lower = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";
type Alpha = Lower | Uppercase<Lower> | "_" | "$";
type AlNum = Alpha | Digit;
type Space = " " | "\n" | "\t" | "\r";
type Tok = [string, string];
type Escapes = { n: "\n"; t: "\t"; r: "\r"; b: "\b"; f: "\f"; v: "\v"; "0": "\0" };
type Unescape<C extends string> = C extends keyof Escapes ? Escapes[C] : C;
// \uXXXX and \xXX of a Latin-1 character
type Chr = ["\u0000", "\u0001", "\u0002", "\u0003", "\u0004", "\u0005", "\u0006", "\u0007", "\b", "\t", "\n", "\u000b", "\f", "\r", "\u000e", "\u000f", "\u0010", "\u0011", "\u0012", "\u0013", "\u0014", "\u0015", "\u0016", "\u0017", "\u0018", "\u0019", "\u001a", "\u001b", "\u001c", "\u001d", "\u001e", "\u001f", " ", "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?", "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_", "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~", "\u007f", "\u0080", "\u0081", "\u0082", "\u0083", "\u0084", "\u0085", "\u0086", "\u0087", "\u0088", "\u0089", "\u008a", "\u008b", "\u008c", "\u008d", "\u008e", "\u008f", "\u0090", "\u0091", "\u0092", "\u0093", "\u0094", "\u0095", "\u0096", "\u0097", "\u0098", "\u0099", "\u009a", "\u009b", "\u009c", "\u009d", "\u009e", "\u009f", "\u00a0", "\u00a1", "\u00a2", "\u00a3", "\u00a4", "\u00a5", "\u00a6", "\u00a7", "\u00a8", "\u00a9", "\u00aa", "\u00ab", "\u00ac", "\u00ad", "\u00ae", "\u00af", "\u00b0", "\u00b1", "\u00b2", "\u00b3", "\u00b4", "\u00b5", "\u00b6", "\u00b7", "\u00b8", "\u00b9", "\u00ba", "\u00bb", "\u00bc", "\u00bd", "\u00be", "\u00bf", "\u00c0", "\u00c1", "\u00c2", "\u00c3", "\u00c4", "\u00c5", "\u00c6", "\u00c7", "\u00c8", "\u00c9", "\u00ca", "\u00cb", "\u00cc", "\u00cd", "\u00ce", "\u00cf", "\u00d0", "\u00d1", "\u00d2", "\u00d3", "\u00d4", "\u00d5", "\u00d6", "\u00d7", "\u00d8", "\u00d9", "\u00da", "\u00db", "\u00dc", "\u00dd", "\u00de", "\u00df", "\u00e0", "\u00e1", "\u00e2", "\u00e3", "\u00e4", "\u00e5", "\u00e6", "\u00e7", "\u00e8", "\u00e9", "\u00ea", "\u00eb", "\u00ec", "\u00ed", "\u00ee", "\u00ef", "\u00f0", "\u00f1", "\u00f2", "\u00f3", "\u00f4", "\u00f5", "\u00f6", "\u00f7", "\u00f8", "\u00f9", "\u00fa", "\u00fb", "\u00fc", "\u00fd", "\u00fe", "\u00ff"];
type HexVal = { "0": 0; "1": 1; "2": 2; "3": 3; "4": 4; "5": 5; "6": 6; "7": 7; "8": 8; "9": 9; "a": 10; "b": 11; "c": 12; "d": 13; "e": 14; "f": 15; "A": 10; "B": 11; "C": 12; "D": 13; "E": 14; "F": 15 };
type Times16<N extends number> = Plus<Plus<Plus<Plus<N, N>, Plus<N, N>>, Plus<Plus<N, N>, Plus<N, N>>>, Plus<Plus<Plus<N, N>, Plus<N, N>>, Plus<Plus<N, N>, Plus<N, N>>>>;
type HexChar<A extends string, B extends string> =
  A extends keyof HexVal ? B extends keyof HexVal ? Chr[Plus<Times16<HexVal[A]>, HexVal[B]>] : "?" : "?";

type Lex<S extends string, Acc extends Tok[] = [], St extends (0 | 1)[] = []> =
  S extends `${infer C}${infer R}`
    ? C extends Space ? Lex<R, Acc, St>
    : S extends `//${string}\n${infer R2}` ? Lex<R2, Acc, St>
    : S extends `/*${infer Body}*/${infer R2}`
      ? Body extends `${string}@native ${infer N}` ? Lex<R2, [...Acc, ["native", NativeName<N>]], St>
      : Body extends `${string}@catch ${infer N}` ? Lex<R2, [...Acc, ["catch", HandlerName<N>]], St>
      : Lex<R2, Acc, St>
    : C extends Alpha ? LexWord<R, C, Acc, St>
    : S extends `0x${infer R2}` ? LexHex<R2, "", Acc, St>
    : C extends Digit ? LexNum<R, C, Acc, St>
    : S extends `-${infer D extends Digit}${infer R2}` ? LexNum<R2, `-${D}`, Acc, St>
    : C extends "\"" | "'" ? LexStr<R, C, "", Acc, St>
    : C extends "`" ? LexTpl<R, "", Acc, St, "tpl_full", "tpl_start">
    : S extends `...${infer R2}` ? Lex<R2, [...Acc, ["...", "..."]], St>
    : S extends `=>${infer R2}` ? Lex<R2, [...Acc, ["=>", "=>"]], St>
    : C extends "{" ? Lex<R, [...Acc, ["{", "{"]], [...St, 0]>
    : C extends "}" ? (St extends [...infer P extends (0 | 1)[], infer L]
        ? L extends 1 ? LexTpl<R, "", Acc, P, "tpl_end", "tpl_mid"> : Lex<R, [...Acc, ["}", "}"]], P>
        : Lex<R, [...Acc, ["}", "}"]], St>)
    : Lex<R, [...Acc, [C, C]], St>
    : Acc;

type NativeName<S extends string, W extends string = ""> =
  S extends `${infer C}${infer R}` ? (C extends Lower | Digit | "_" ? NativeName<R, `${W}${C}`> : W) : W;
type HandlerName<S extends string, W extends string = ""> =
  S extends `${infer C}${infer R}` ? (C extends AlNum ? HandlerName<R, `${W}${C}`> : W) : W;
type LexWord<S extends string, W extends string, Acc extends Tok[], St extends (0 | 1)[]> =
  S extends `${infer C}${infer R}`
    ? C extends AlNum ? LexWord<R, `${W}${C}`, Acc, St> : Lex<S, [...Acc, ["id", W]], St>
    : [...Acc, ["id", W]];

type LexNum<S extends string, W extends string, Acc extends Tok[], St extends (0 | 1)[]> =
  S extends `${infer C}${infer R}`
    ? C extends Digit | "." ? LexNum<R, `${W}${C}`, Acc, St>
    : C extends "n" ? Lex<R, [...Acc, ["big", W]], St>
    : Lex<S, [...Acc, ["num", W]], St>
    : [...Acc, ["num", W]];

type LexHex<S extends string, W extends string, Acc extends Tok[], St extends (0 | 1)[]> =
  S extends `${infer C}${infer R}`
    ? C extends keyof HexVal ? LexHex<R, `${W}${C}`, Acc, St>
    : C extends "n" ? Lex<R, [...Acc, ["big", HexToDec<W>]], St>
    : Lex<S, [...Acc, ["num", HexToDec<W>]], St>
    : [...Acc, ["num", HexToDec<W>]];
// the decimal text of hexadecimal digits: digits (least significant first)
// times 16 plus the next, by a table of x * 16 + c = [digit, carry]
type HexToDec<H extends string, D extends number[] = []> =
  H extends `${infer C extends keyof HexVal}${infer R}` ? HexToDec<R, MulAdd16<D, HexVal[C]>> : DecText<D>;
type MulAdd16<D extends number[], C extends number> =
  D extends [infer X extends number, ...infer R extends number[]]
    ? T16[X][C] extends [infer Y extends number, infer C2 extends number] ? [Y, ...MulAdd16<R, C2>] : never
    : C extends 0 ? [] : T16[0][C] extends [infer Y extends number, infer C2 extends number] ? [Y, ...MulAdd16<[], C2>] : never;
type DecText<D extends number[]> = D extends [] ? "0" : D extends [...infer R extends number[], infer X extends number] ? `${X}${DecText2<R>}` : "";
type DecText2<D extends number[]> = D extends [...infer R extends number[], infer X extends number] ? `${X}${DecText2<R>}` : "";
type T16 = [[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]], [[6, 1], [7, 1], [8, 1], [9, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [0, 3], [1, 3]], [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4]], [[8, 4], [9, 4], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [0, 6], [1, 6], [2, 6], [3, 6]], [[4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7]], [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9]], [[6, 9], [7, 9], [8, 9], [9, 9], [0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [0, 11], [1, 11]], [[2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12]], [[8, 12], [9, 12], [0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [0, 14], [1, 14], [2, 14], [3, 14]], [[4, 14], [5, 14], [6, 14], [7, 14], [8, 14], [9, 14], [0, 15], [1, 15], [2, 15], [3, 15], [4, 15], [5, 15], [6, 15], [7, 15], [8, 15], [9, 15]]];
type LexStr<S extends string, Q extends string, T extends string, Acc extends Tok[], St extends (0 | 1)[]> =
  S extends `${infer C}${infer R}`
    ? C extends Q ? Lex<R, [...Acc, ["str", T]], St>
    : C extends "\\" ? (R extends `u00${infer A}${infer B}${infer R2}` ? LexStr<R2, Q, `${T}${HexChar<A, B>}`, Acc, St>
      : R extends `x${infer A}${infer B}${infer R2}` ? LexStr<R2, Q, `${T}${HexChar<A, B>}`, Acc, St>
      : R extends `${infer E}${infer R2}` ? LexStr<R2, Q, `${T}${Unescape<E>}`, Acc, St> : Acc)
    : LexStr<R, Q, `${T}${C}`, Acc, St>
    : Acc;

// a template's text up to its end (Full, or End after a hole) or a hole
// (Start, or Mid after one)
type LexTpl<S extends string, T extends string, Acc extends Tok[], St extends (0 | 1)[], End extends string, Hole extends string> =
  S extends `\`${infer R}` ? Lex<R, [...Acc, [End, T]], St>
  : S extends `\${${infer R}` ? Lex<R, [...Acc, [Hole, T]], [...St, 1]>
  : S extends `\\u00${infer A}${infer B}${infer R}` ? LexTpl<R, `${T}${HexChar<A, B>}`, Acc, St, End, Hole>
  : S extends `\\x${infer A}${infer B}${infer R}` ? LexTpl<R, `${T}${HexChar<A, B>}`, Acc, St, End, Hole>
  : S extends `\\${infer E}${infer R}` ? LexTpl<R, `${T}${Unescape<E>}`, Acc, St, End, Hole>
  : S extends `${infer C}${infer R}` ? LexTpl<R, `${T}${C}`, Acc, St, End, Hole>
  : Acc;

// ---------------------------------------------------------------------------
// Parser. Nodes:
//   ["ref", name, args]  ["num", text]  ["big", text]  ["str", text]  ["kw", name]
//   ["tuple", [["req" | "opt" | "rest", node]...]]  ["arr", node]  ["idx", node, node]
//   ["union", nodes]  ["inter", nodes]  ["keyof", node]
//   ["tpl", texts, nodes]  ["fn", [[name, node, rest]...], node]
//   ["obj", [[name, node, opt, ro]...]]  ["mapped", key, constraint, as | null, body, ro, opt]
//   ["cond", check, ext, true, false]  ["infer", name, constraint | null]
// Declarations: [name, [[param, default | null]...], body]

type Keyword = "any" | "unknown" | "never" | "string" | "number" | "bigint" | "symbol" | "object"
  | "null" | "undefined" | "void" | "true" | "false" | "boolean";

// [global name, parameters, body, file, native (a doc comment's `@native
// name`, or ""), handler (`@catch H`, or "")]: a file's aliases are named
// `file:name`, but for the lib's and the program's own (the first file)
type Decl = [string, [string, any][], any, string, string, string];

// a file: [declarations, imports [["ns", name, spec] | ["named", local,
// imported, spec]...], re-exports [[exported, imported, spec]...]]
type ParseFile<T, F extends string, Pre extends string, Acc extends Decl[] = [], Is extends any[] = [], Rs extends any[] = [], Nat extends string = "", Cat extends string = ""> =
  T extends [["native", infer X extends string], ...infer R] ? ParseFile<R, F, Pre, Acc, Is, Rs, X, Cat>
  : T extends [["catch", infer X extends string], ...infer R] ? ParseFile<R, F, Pre, Acc, Is, Rs, Nat, X>
  : T extends [["id", "import"], ...infer R]
    ? (R extends [["id", "type"], ...infer R2] ? R2 : R) extends infer R3
      ? R3 extends [["*", "*"], ["id", "as"], ["id", infer NS extends string], ["id", "from"], ["str", infer Spec extends string], ...infer R4]
        ? ParseFile<SkipSemi<R4>, F, Pre, Acc, [...Is, ["ns", NS, Spec]], Rs>
      : R3 extends [["{", "{"], ...infer R4]
        ? ParseNames<R4> extends [infer Ns extends [string, string][], [["id", "from"], ["str", infer Spec extends string], ...infer R5]]
          ? ParseFile<SkipSemi<R5>, F, Pre, Acc, [...Is, ...{ [K in keyof Ns]: ["named", Ns[K][1], Ns[K][0], Spec] }], Rs>
          : [Acc, Is, Rs]
        : [Acc, Is, Rs]
      : never
  : T extends [["id", "export"], ["id", "type"], ["{", "{"], ...infer R]
    ? ParseNames<R> extends [infer Ns extends [string, string][], [["id", "from"], ["str", infer Spec extends string], ...infer R5]]
      ? ParseFile<SkipSemi<R5>, F, Pre, Acc, Is, [...Rs, ...{ [K in keyof Ns]: [Ns[K][1], Ns[K][0], Spec] }]>
      : [Acc, Is, Rs]
  : T extends [["id", "export"], ...infer R] ? ParseFile<R, F, Pre, Acc, Is, Rs, Nat, Cat>
  : T extends [["id", "interface"], ["id", infer N extends string], ...infer R]
    ? ParseParams<R> extends [infer Ps extends [string, any][], [["{", "{"], ...infer R2]]
      ? ParseObj<R2> extends [infer B, infer R3]
        ? ParseFile<SkipSemi<R3>, F, Pre, [...Acc, [`${Pre}${N}`, Ps, B, F, Nat, Cat]], Is, Rs>
        : [Acc, Is, Rs]
      : [Acc, Is, Rs]
  : T extends [["id", "type"], ["id", infer N extends string], ...infer R]
    ? ParseParams<R> extends [infer Ps extends [string, any][], [["=", "="], ...infer R2]]
      ? ParseType<R2> extends [infer B, infer R3]
        ? ParseFile<SkipSemi<R3>, F, Pre, [...Acc, [`${Pre}${N}`, Ps, B, F, Nat, Cat]], Is, Rs>
        : [Acc, Is, Rs]
      : [Acc, Is, Rs]
  : [Acc, Is, Rs];
type SkipSemi<T> = T extends [[";", ";"], ...infer R] ? R : T;
// `a, b as c }`: [[imported, local]...]
type ParseNames<T, Acc extends [string, string][] = []> =
  T extends [["}", "}"], ...infer R] ? [Acc, R]
  : T extends [[",", ","], ...infer R] ? ParseNames<R, Acc>
  : T extends [["id", infer A extends string], ["id", "as"], ["id", infer B extends string], ...infer R] ? ParseNames<R, [...Acc, [A, B]]>
  : T extends [["id", infer A extends string], ...infer R] ? ParseNames<R, [...Acc, [A, A]]>
  : [Acc, T];

type ParseParams<T> =
  T extends [["<", "<"], ...infer R] ? ParseParamList<R> : [[], T];

type ParseParamList<T, Acc extends [string, any][] = []> =
  T extends [[">", ">"], ...infer R] ? [Acc, R]
  : T extends [[",", ","], ...infer R] ? ParseParamList<R, Acc>
  : T extends [["id", infer N extends string], ...infer R]
    ? SkipConstraint<R> extends infer R2
      ? R2 extends [["=", "="], ...infer R3]
        ? ParseType<R3> extends [infer D, infer R4] ? ParseParamList<R4, [...Acc, [N, D]]> : never
        : ParseParamList<R2, [...Acc, [N, null]]>
      : never
  : never;

// (constraints of type parameters do not change what an alias evaluates to)
type SkipConstraint<T> =
  T extends [["id", "extends"], ...infer R]
    ? ParseType<R> extends [any, infer R2] ? R2 : never
    : T;

type ParseType<T> =
  ParseUnion<T> extends [infer A, infer R]
    ? R extends [["id", "extends"], ...infer R2]
      ? ParseUnion<R2> extends [infer E, [["?", "?"], ...infer R3]]
        ? ParseType<R3> extends [infer X, [[":", ":"], ...infer R4]]
          ? ParseType<R4> extends [infer Y, infer R5] ? [["cond", A, E, X, Y], R5] : never
          : never
        : never
      : [A, R]
    : never;

type ParseUnion<T> =
  (T extends [["|", "|"], ...infer R] ? R : T) extends infer T2
    ? ParseInter<T2> extends [infer A, infer R] ? UnionLoop<[A], R> : never
    : never;
type UnionLoop<Xs extends any[], T> =
  T extends [["|", "|"], ...infer R]
    ? ParseInter<R> extends [infer A, infer R2] ? UnionLoop<[...Xs, A], R2> : never
    : [Xs extends [infer X] ? X : ["union", Xs], T];

type ParseInter<T> =
  (T extends [["&", "&"], ...infer R] ? R : T) extends infer T2
    ? ParseOp<T2> extends [infer A, infer R] ? InterLoop<[A], R> : never
    : never;
type InterLoop<Xs extends any[], T> =
  T extends [["&", "&"], ...infer R]
    ? ParseOp<R> extends [infer A, infer R2] ? InterLoop<[...Xs, A], R2> : never
    : [Xs extends [infer X] ? X : ["inter", Xs], T];

type ParseOp<T> =
  T extends [["id", "keyof"], ...infer R]
    ? ParseOp<R> extends [infer A, infer R2] ? [["keyof", A], R2] : never
  : T extends [["id", "readonly"], ...infer R] ? ParseOp<R>
  : ParsePostfix<T>;

type ParsePostfix<T> =
  ParsePrimary<T> extends [infer A, infer R] ? PostfixLoop<A, R> : never;

type PostfixLoop<A, T> =
  T extends [["[", "["], ["]", "]"], ...infer R] ? PostfixLoop<["arr", A], R>
  : T extends [["[", "["], ...infer R]
    ? ParseType<R> extends [infer K, [["]", "]"], ...infer R2]] ? PostfixLoop<["idx", A, K], R2> : never
  : [A, T];

type ParsePrimary<T> =
  T extends [["num", infer X extends string], ...infer R] ? [["num", X], R]
  : T extends [["big", infer X extends string], ...infer R] ? [["big", X], R]
  : T extends [["str", infer X extends string], ...infer R] ? [["str", X], R]
  : T extends [["tpl_full", infer X extends string], ...infer R] ? [["tpl", [X], []], R]
  : T extends [["tpl_start", infer X extends string], ...infer R] ? ParseTpl<R, [X], []>
  : T extends [["(", "("], ...infer R]
    ? IsFnParams<R> extends true ? ParseFn<R>
    : ParseType<R> extends [infer A, [[")", ")"], ...infer R2]] ? [A, R2] : never
  : T extends [["[", "["], ...infer R] ? ParseTuple<R>
  : T extends [["{", "{"], ...infer R] ? ParseObj<R>
  : T extends [["id", "infer"], ["id", infer N extends string], ...infer R]
    ? R extends [["id", "extends"], ...infer R2]
      ? ParseOp<R2> extends [infer C, infer R3] ? [["infer", N, C], R3] : never
      : [["infer", N, null], R]
  : T extends [["id", infer K extends Keyword], ...infer R] ? [["kw", K], R]
  : T extends [["id", infer NS extends string], [".", "."], ["id", infer N extends string], ...infer R]
    ? (R extends [["<", "<"], ...infer R2] ? ParseArgs<R2> : [[], R]) extends [infer As, infer R3] ? [["ref", `${NS}.${N}`, As], R3] : never
  : T extends [["id", infer N extends string], ["<", "<"], ...infer R]
    ? ParseArgs<R> extends [infer As, infer R2] ? [["ref", N, As], R2] : never
  : T extends [["id", infer N extends string], ...infer R] ? [["ref", N, []], R]
  : never;

type ParseTpl<T, Texts extends string[], Xs extends any[]> =
  ParseType<T> extends [infer A, infer R]
    ? R extends [["tpl_mid", infer X extends string], ...infer R2] ? ParseTpl<R2, [...Texts, X], [...Xs, A]>
    : R extends [["tpl_end", infer X extends string], ...infer R2] ? [["tpl", [...Texts, X], [...Xs, A]], R2]
    : never
    : never;

type ParseArgs<T, Acc extends any[] = []> =
  T extends [[">", ">"], ...infer R] ? [Acc, R]
  : T extends [[",", ","], ...infer R] ? ParseArgs<R, Acc>
  : ParseType<T> extends [infer A, infer R] ? ParseArgs<R, [...Acc, A]> : never;

type ParseTuple<T, Acc extends any[] = []> =
  T extends [["]", "]"], ...infer R] ? [["tuple", Acc], R]
  : T extends [[",", ","], ...infer R] ? ParseTuple<R, Acc>
  : T extends [["...", "..."], ...infer R]
    ? ParseType<R> extends [infer A, infer R2] ? ParseTuple<R2, [...Acc, ["rest", A]]> : never
  : ParseType<T> extends [infer A, infer R]
    ? R extends [["?", "?"], ...infer R2] ? ParseTuple<R2, [...Acc, ["opt", A]]> : ParseTuple<R, [...Acc, ["req", A]]>
    : never;

// `(` starts a function type when `)` `=>`, `...`, or a name and `:`, `?`,
// `,` or `)` follow
type IsFnParams<T> =
  T extends [[")", ")"], ["=>", "=>"], ...any[]] ? true
  : T extends [["...", "..."], ...any[]] ? true
  : T extends [["id", string], [":" | "?" | "," | ")", string], ...any[]]
    ? (T extends [any, [")", ")"], ...infer R] ? (R extends [["=>", "=>"], ...any[]] ? true : false) : true)
  : false;
type ParseFn<T, Ps extends [string, any, boolean][] = []> =
  T extends [[")", ")"], ["=>", "=>"], ...infer R]
    ? ParseType<R> extends [infer Ret, infer R2] ? [["fn", Ps, Ret], R2] : never
  : T extends [[",", ","], ...infer R] ? ParseFn<R, Ps>
  : (T extends [["...", "..."], ...infer R] ? [true, R] : [false, T]) extends [infer Rest extends boolean, [["id", infer N extends string], ...infer R]]
    ? (R extends [["?", "?"], ...infer R2] ? R2 : R) extends infer R3
      ? R3 extends [[":", ":"], ...infer R4]
        ? ParseType<R4> extends [infer A, infer R5] ? ParseFn<R5, [...Ps, [N, A, Rest]]> : never
        : ParseFn<R3, [...Ps, [N, ["kw", "any"], Rest]]>
      : never
    : never;

// object type literals: properties, or a mapped type
type ParseObj<T, Acc extends any[] = []> =
  T extends [["}", "}"], ...infer R] ? [["obj", Acc], R]
  : T extends [[";" | ",", string], ...infer R] ? ParseObj<R, Acc>
  : ParseMapped<T> extends [infer M, infer R] ? [M, R]
  : (T extends [["id", "readonly"], ["id" | "str" | "num", string], ...infer R] ? [true, T extends [any, ...infer R2] ? R2 : never] : [false, T]) extends
      [infer Ro extends boolean, [["id" | "str" | "num", infer N extends string], ...infer R]]
    ? (R extends [["?", "?"], ...infer R2] ? [true, R2] : [false, R]) extends [infer Opt extends boolean, [[":", ":"], ...infer R3]]
      ? ParseType<R3> extends [infer A, infer R4] ? ParseObj<R4, [...Acc, [N, A, Opt, Ro]]> : never
      : never
    : never;

type ParseMapped<T> =
  (T extends [["id", "readonly"], ...infer R] ? [1, R]
   : T extends [["+", "+"], ["id", "readonly"], ...infer R] ? [1, R]
   : T extends [["-", "-"], ["id", "readonly"], ...infer R] ? [-1, R]
   : [0, T]) extends [infer Ro extends number, [["[", "["], ["id", infer K extends string], ["id", "in"], ...infer R]]
    ? ParseType<R> extends [infer C, infer R2]
      ? (R2 extends [["id", "as"], ...infer R3] ? (ParseType<R3> extends [infer A, infer R4] ? [A, R4] : never) : [null, R2]) extends
          [infer As, [["]", "]"], ...infer R5]]
        ? (R5 extends [["?", "?"], ...infer R6] ? [1, R6]
           : R5 extends [["+", "+"], ["?", "?"], ...infer R6] ? [1, R6]
           : R5 extends [["-", "-"], ["?", "?"], ...infer R6] ? [-1, R6]
           : [0, R5]) extends [infer Opt extends number, [[":", ":"], ...infer R7]]
          ? ParseType<R7> extends [infer B, infer R8]
            ? (R8 extends [[";" | ",", string], ...infer R9] ? R9 : R8) extends [["}", "}"], ...infer R10]
              ? [["mapped", K, C, As, B, Ro, Opt], R10]
              : false
            : false
          : false
        : false
      : false
    : false;

// ---------------------------------------------------------------------------
// Numbers and text

type Len<S extends string, N extends 0[] = []> = S extends `${string}${infer R}` ? Len<R, [...N, 0]> : N["length"];
type Range<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc : Range<N, [...Acc, Acc["length"]]>;
type Plus<A extends number, B extends number> = [...Range<A>, ...Range<B>]["length"] & number;
type IndexOf<X, L extends any[], I extends 0[] = []> =
  L extends [infer H, ...infer R] ? ([H] extends [X] ? I["length"] : IndexOf<X, R, [...I, 0]>) : -1;
// (text is built front to back, each step appending to what it was given: a
// step returning text it then prefixes leaves every suffix in the memo table)
type Join<L extends string[], Sep extends string = "", Acc extends string = ""> =
  L extends [infer H extends string, ...infer R extends string[]] ? Join<R, Sep, Acc extends "" ? H : `${Acc}${Sep}${H}`> : Acc;

// UTF-16 code units of ASCII text, as an LLVM string constant's bytes
type U16<S extends string, Acc extends string = ""> =
  S extends `${infer C}${infer R}` ? U16<R, `${Acc}${C extends keyof LLChar ? LLChar[C] : "?"}\\00`> : Acc;
type CStr<S extends string> = `c"${S}\\00"`;
type LLChar = { "\u0000": "\\00"; "\u0001": "\\01"; "\u0002": "\\02"; "\u0003": "\\03"; "\u0004": "\\04"; "\u0005": "\\05"; "\u0006": "\\06"; "\u0007": "\\07"; "\b": "\\08"; "\t": "\\09"; "\n": "\\0A"; "\u000b": "\\0B"; "\f": "\\0C"; "\r": "\\0D"; "\u000e": "\\0E"; "\u000f": "\\0F"; "\u0010": "\\10"; "\u0011": "\\11"; "\u0012": "\\12"; "\u0013": "\\13"; "\u0014": "\\14"; "\u0015": "\\15"; "\u0016": "\\16"; "\u0017": "\\17"; "\u0018": "\\18"; "\u0019": "\\19"; "\u001a": "\\1A"; "\u001b": "\\1B"; "\u001c": "\\1C"; "\u001d": "\\1D"; "\u001e": "\\1E"; "\u001f": "\\1F"; " ": " "; "!": "!"; "\"": "\\22"; "#": "#"; "$": "$"; "%": "%"; "&": "&"; "'": "'"; "(": "("; ")": ")"; "*": "*"; "+": "+"; ",": ","; "-": "-"; ".": "."; "/": "/"; "0": "0"; "1": "1"; "2": "2"; "3": "3"; "4": "4"; "5": "5"; "6": "6"; "7": "7"; "8": "8"; "9": "9"; ":": ":"; ";": ";"; "<": "<"; "=": "="; ">": ">"; "?": "?"; "@": "@"; "A": "A"; "B": "B"; "C": "C"; "D": "D"; "E": "E"; "F": "F"; "G": "G"; "H": "H"; "I": "I"; "J": "J"; "K": "K"; "L": "L"; "M": "M"; "N": "N"; "O": "O"; "P": "P"; "Q": "Q"; "R": "R"; "S": "S"; "T": "T"; "U": "U"; "V": "V"; "W": "W"; "X": "X"; "Y": "Y"; "Z": "Z"; "[": "["; "\\": "\\5C"; "]": "]"; "^": "^"; "_": "_"; "`": "`"; "a": "a"; "b": "b"; "c": "c"; "d": "d"; "e": "e"; "f": "f"; "g": "g"; "h": "h"; "i": "i"; "j": "j"; "k": "k"; "l": "l"; "m": "m"; "n": "n"; "o": "o"; "p": "p"; "q": "q"; "r": "r"; "s": "s"; "t": "t"; "u": "u"; "v": "v"; "w": "w"; "x": "x"; "y": "y"; "z": "z"; "{": "{"; "|": "|"; "}": "}"; "~": "~"; "\u007f": "\\7F"; "\u0080": "\\80"; "\u0081": "\\81"; "\u0082": "\\82"; "\u0083": "\\83"; "\u0084": "\\84"; "\u0085": "\\85"; "\u0086": "\\86"; "\u0087": "\\87"; "\u0088": "\\88"; "\u0089": "\\89"; "\u008a": "\\8A"; "\u008b": "\\8B"; "\u008c": "\\8C"; "\u008d": "\\8D"; "\u008e": "\\8E"; "\u008f": "\\8F"; "\u0090": "\\90"; "\u0091": "\\91"; "\u0092": "\\92"; "\u0093": "\\93"; "\u0094": "\\94"; "\u0095": "\\95"; "\u0096": "\\96"; "\u0097": "\\97"; "\u0098": "\\98"; "\u0099": "\\99"; "\u009a": "\\9A"; "\u009b": "\\9B"; "\u009c": "\\9C"; "\u009d": "\\9D"; "\u009e": "\\9E"; "\u009f": "\\9F"; "\u00a0": "\\A0"; "\u00a1": "\\A1"; "\u00a2": "\\A2"; "\u00a3": "\\A3"; "\u00a4": "\\A4"; "\u00a5": "\\A5"; "\u00a6": "\\A6"; "\u00a7": "\\A7"; "\u00a8": "\\A8"; "\u00a9": "\\A9"; "\u00aa": "\\AA"; "\u00ab": "\\AB"; "\u00ac": "\\AC"; "\u00ad": "\\AD"; "\u00ae": "\\AE"; "\u00af": "\\AF"; "\u00b0": "\\B0"; "\u00b1": "\\B1"; "\u00b2": "\\B2"; "\u00b3": "\\B3"; "\u00b4": "\\B4"; "\u00b5": "\\B5"; "\u00b6": "\\B6"; "\u00b7": "\\B7"; "\u00b8": "\\B8"; "\u00b9": "\\B9"; "\u00ba": "\\BA"; "\u00bb": "\\BB"; "\u00bc": "\\BC"; "\u00bd": "\\BD"; "\u00be": "\\BE"; "\u00bf": "\\BF"; "\u00c0": "\\C0"; "\u00c1": "\\C1"; "\u00c2": "\\C2"; "\u00c3": "\\C3"; "\u00c4": "\\C4"; "\u00c5": "\\C5"; "\u00c6": "\\C6"; "\u00c7": "\\C7"; "\u00c8": "\\C8"; "\u00c9": "\\C9"; "\u00ca": "\\CA"; "\u00cb": "\\CB"; "\u00cc": "\\CC"; "\u00cd": "\\CD"; "\u00ce": "\\CE"; "\u00cf": "\\CF"; "\u00d0": "\\D0"; "\u00d1": "\\D1"; "\u00d2": "\\D2"; "\u00d3": "\\D3"; "\u00d4": "\\D4"; "\u00d5": "\\D5"; "\u00d6": "\\D6"; "\u00d7": "\\D7"; "\u00d8": "\\D8"; "\u00d9": "\\D9"; "\u00da": "\\DA"; "\u00db": "\\DB"; "\u00dc": "\\DC"; "\u00dd": "\\DD"; "\u00de": "\\DE"; "\u00df": "\\DF"; "\u00e0": "\\E0"; "\u00e1": "\\E1"; "\u00e2": "\\E2"; "\u00e3": "\\E3"; "\u00e4": "\\E4"; "\u00e5": "\\E5"; "\u00e6": "\\E6"; "\u00e7": "\\E7"; "\u00e8": "\\E8"; "\u00e9": "\\E9"; "\u00ea": "\\EA"; "\u00eb": "\\EB"; "\u00ec": "\\EC"; "\u00ed": "\\ED"; "\u00ee": "\\EE"; "\u00ef": "\\EF"; "\u00f0": "\\F0"; "\u00f1": "\\F1"; "\u00f2": "\\F2"; "\u00f3": "\\F3"; "\u00f4": "\\F4"; "\u00f5": "\\F5"; "\u00f6": "\\F6"; "\u00f7": "\\F7"; "\u00f8": "\\F8"; "\u00f9": "\\F9"; "\u00fa": "\\FA"; "\u00fb": "\\FB"; "\u00fc": "\\FC"; "\u00fd": "\\FD"; "\u00fe": "\\FE"; "\u00ff": "\\FF" };

// ---------------------------------------------------------------------------
// Code generation. Ctx: [alias, scope [[name, slot]...], decls, binders
// [[path, name]...] (infers and mapped types' keys), params, frame].
// Gen<node, path, ctx> is [instructions, register, definitions]; names of
// registers and globals are made of the node's path.

type Ctx = [string, [string, number][], any, [string, string][], number, number, any];
type G = [string, string, string];

type Kw = { any: 0; unknown: 1; never: 2; string: 3; number: 4; bigint: 5; symbol: 6; object: 7;
  null: 8; undefined: 9; void: 10; true: 11; false: 12 };
type Imm<K extends number> = Plus<Plus<Plus<Plus<Plus<Plus<Plus<K, K>, K>, K>, K>, K>, K>, Plus<K, 2>>;
type Intrinsic = { Uppercase: 0; Lowercase: 1; Capitalize: 2; Uncapitalize: 3 };

type Slot<S extends [string, number][], N extends string> =
  S extends [...infer R extends [string, number][], [N, infer K extends number]] ? K
  : S extends [...infer R extends [string, number][], any] ? Slot<R, N> : -1;
// the declarations by name: one object (a memoized alias's context holds it
// as an object, hashed by identity, not as a tuple hashed through)
// (objects made by one mapped type over the tuple's indices: a chain of
// intersections looks every name up in every member)
type DeclMap<Ds> = { [I in keyof Ds as I extends `${number}` ? (Ds[I] extends Decl ? Ds[I][0] : never) : never]: Ds[I] };
type Flat<T> = { [K in keyof T]: T[K] };
type FindDecl<M, N extends string> = N extends keyof M ? M[N] : false;
type Frame<D extends Decl> = Plus<D[1]["length"], Binders<D[2], ".b">["length"]>;

// the infers and mapped type keys of a node, [path, name] in order
type Binders<X, P extends string> =
  X extends ["infer", infer N extends string, infer C] ? [[P, N], ...Binders<C, `${P}.2`>]
  : X extends ["mapped", infer K extends string, infer C, infer A, infer B, any, any]
    ? [[P, K], ...Binders<C, `${P}.2`>, ...Binders<A, `${P}.3`>, ...Binders<B, `${P}.4`>]
  : X extends ["cond", infer A, infer E, infer T, infer F]
    ? [...Binders<A, `${P}.0`>, ...Binders<E, `${P}.1`>, ...Binders<T, `${P}.2`>, ...Binders<F, `${P}.3`>]
  : X extends ["tuple", infer Es extends any[]] ? BindersList<{ [K in keyof Es]: Es[K][1] }, P>
  : X extends ["union" | "inter", infer Xs extends any[]] ? BindersList<Xs, P>
  : X extends ["tpl", any, infer Xs extends any[]] ? BindersList<Xs, P>
  : X extends ["obj", infer Ps extends any[]] ? BindersList<{ [K in keyof Ps]: Ps[K][1] }, P>
  : X extends ["fn", infer Ps extends any[], infer R] ? [...BindersList<{ [K in keyof Ps]: Ps[K][1] }, P>, ...Binders<R, `${P}.r`>]
  : X extends ["arr" | "keyof", infer A] ? Binders<A, `${P}.0`>
  : X extends ["idx", infer A, infer K] ? [...Binders<A, `${P}.0`>, ...Binders<K, `${P}.1`>]
  : X extends ["ref", string, infer As extends any[]] ? BindersList<As, P>
  : [];
type BindersList<Xs extends any[], P extends string, I extends 0[] = []> =
  Xs extends [infer A, ...infer R] ? [...Binders<A, `${P}.${I["length"]}`>, ...BindersList<R, P, [...I, 0]>] : [];

// the slot of the binder at path Q
type BinderSlot<C extends Ctx, Q extends string> =
  IndexOf<Q, PathsOf<C[3]>> extends infer I extends number ? (I extends -1 ? -1 : Plus<C[4], I>) : never;
type PathsOf<L extends [string, string][]> = { [K in keyof L]: L[K][0] };
// the binders declared in the subtree at P, in scope
type Bind<C extends Ctx, P extends string, L extends [string, string][] = C[3]> =
  L extends [[infer Q extends string, infer N extends string], ...infer R extends [string, string][]]
    ? Q extends P | `${P}.${string}` ? [[N, BinderSlot<C, Q>], ...Bind<C, P, R>] : Bind<C, P, R>
    : [];
type WithScope<C extends Ctx, S extends [string, number][]> = [C[0], [...C[1], ...S], C[2], C[3], C[4], C[5], C[6]];

type Gen<X, P extends string, C extends Ctx> =
  X extends ["num", infer T extends string] ? [`  %r${P} = call i64 @mk_num(double ${T extends `${string}.${string}` ? T : `${T}.0`})\n`, `%r${P}`, ""]
  : X extends ["big", infer T extends string]
    ? Len<T> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18
      ? [`  %s${P} = shl i64 ${T}, 1\n  %r${P} = or i64 %s${P}, 1\n`, `%r${P}`, ""]
      : [`  %r${P} = call i64 @mk_bigint_text(ptr ${StrName<C, P>})\n`, `%r${P}`, StrDef<T, C, P>]
  : X extends ["str", infer T extends string] ? ["", StrRef<C, P>, StrDef<T, C, P>]
  : X extends ["kw", "boolean"] ? [`  %r${P} = call i64 @rt_union2(i64 90, i64 98)\n`, `%r${P}`, ""]
  : X extends ["kw", infer K extends keyof Kw] ? ["", `${Imm<Kw[K]>}`, ""]
  : X extends ["arr", infer A] ? Op1<Gen<A, `${P}.0`, C>, P, "rt_array", ", i64 0">
  : X extends ["keyof", infer A] ? Op1<Gen<A, `${P}.0`, C>, P, "rt_keyof", "">
  : X extends ["idx", infer A, infer K] ? GenIdx<Gen<A, `${P}.0`, C>, Gen<K, `${P}.1`, C>, P>
  : X extends ["tuple", infer Es extends any[]] ? GenTuple<Es, P, C>
  : X extends ["union", infer Xs extends any[]] ? GenSet<Xs, P, C, "rt_union">
  : X extends ["inter", infer Xs extends any[]] ? GenSet<Xs, P, C, "rt_inter">
  : X extends ["tpl", infer Ts extends string[], infer Xs extends any[]] ? GenTpl<Ts, Xs, P, C>
  : X extends ["fn", infer Ps extends any[], infer R] ? GenFn<Ps, R, P, C>
  : X extends ["obj", infer Ps extends any[]] ? GenObj<Ps, P, C>
  : X extends ["mapped", any, any, any, any, any, any] ? GenMapped<X, P, C>
  : X extends ["cond", ["obj", infer Ps extends any[]], ["infer", infer T extends string, null],
      ["cond", infer K, ["infer", infer N extends string, ["keyof", ["ref", T, []]]], ["idx", ["ref", T, []], ["ref", N, []]], infer D], ["kw", "never"]]
    ? GenDispatch<Ps, K, D, P, C>
  : X extends ["cond", any, any, any, any] ? GenCond<X, P, C>
  : X extends ["infer", any, any] ? (BinderSlot<C, P> extends infer K extends number ? (K extends -1 ? ["", "18", ""] : GenLoad<K, P>) : never)
  : X extends ["ref", infer N extends keyof Intrinsic, [infer A]]
    ? Op1<Gen<A, `${P}.0`, C>, P, "string_mapping", "", `i32 ${Intrinsic[N]}, `>
  : X extends ["ref", infer N extends string, []] ? (Slot<C[1], N> extends infer K extends number
      ? K extends -1 ? GenCall<N, [], P, C> : GenLoad<K, P> : never)
  : X extends ["ref", infer N extends string, infer As extends any[]] ? GenCall<N, As, P, C>
  : ["", "18", ""];  // (not supported yet: never)

type GenLoad<K extends number, P extends string> =
  [`  %g${P} = getelementptr inbounds i64, ptr %env, i64 ${K}\n  %r${P} = load i64, ptr %g${P}\n`, `%r${P}`, ""];
type Op1<A extends G, P extends string, F extends string, Extra extends string, Pre extends string = ""> =
  [`${A[0]}  %r${P} = call i64 @${F}(${Pre}i64 ${A[1]}${Extra})\n`, `%r${P}`, A[2]];
type GenIdx<A extends G, K extends G, P extends string> =
  [`${A[0]}${K[0]}  %r${P} = call i64 @rt_index(i64 ${A[1]}, i64 ${K[1]})\n`, `%r${P}`, `${A[2]}${K[2]}`];

// a string literal type: a static object of the runtime's layout
type StrName<C extends Ctx, P extends string> = `@"s.${C[0]}${P}"`;
type StrRef<C extends Ctx, P extends string> = `ptrtoint (ptr ${StrName<C, P>} to i64)`;
type StrDef<T extends string, C extends Ctx, P extends string> =
  Len<T> extends infer L extends number
    ? `${StrName<C, P>} = internal global { i32, i32, i32, i32, ptr, i32, i32, ptr, [${Plus<L, L>} x i8] } { i32 16, i32 0, i32 0, i32 ${L}, ptr getelementptr inbounds (i8, ptr ${StrName<C, P>}, i64 24), i32 ${L}, i32 -1, ptr getelementptr inbounds (i8, ptr ${StrName<C, P>}, i64 40), [${Plus<L, L>} x i8] c"${U16<T>}" }, align 8\n`
    : never;
// static strings for each of the texts, and an array of them
type StrArray<Ts extends string[], C extends Ctx, P extends string> =
  `${Join<{ [K in keyof Ts]: StrDef<Ts[K], C, `${P}.t${K & string}`> }>}@"ta.${C[0]}${P}" = internal constant [${Ts["length"]} x ptr] [${Join<{ [K in keyof Ts]: `ptr ${StrName<C, `${P}.t${K & string}`>}` }, ", ">}]\n`;

// arguments or elements: [instructions, registers, definitions]
type GenList<Xs extends any[], P extends string, C extends Ctx, I extends 0[] = [], Acc extends [string, string[], string] = ["", [], ""]> =
  Xs extends [infer X, ...infer R]
    ? Gen<X, `${P}.${I["length"]}`, C> extends [infer A extends string, infer V extends string, infer D extends string]
      ? GenList<R, P, C, [...I, 0], [`${Acc[0]}${A}`, [...Acc[1], V], `${Acc[2]}${D}`]>
      : never
    : Acc;
// the values in an array of the frame's function
type GenArray<Xs extends any[], P extends string, C extends Ctx, Tag extends string> =
  GenList<Xs, P, C> extends [infer A extends string, infer Vs extends string[], infer D extends string]
    ? [`${A}  %${Tag}${P} = alloca [${Xs["length"] extends 0 ? 1 : Xs["length"]} x i64]\n${StoreAll<Vs, `%${Tag}${P}`, `${Tag}${P}`>}`, D]
    : never;

type StoreAll<Vs extends string[], Base extends string, Tag extends string, I extends 0[] = [], Acc extends string = ""> =
  Vs extends [infer V extends string, ...infer R extends string[]]
    ? StoreAll<R, Base, Tag, [...I, 0], `${Acc}  %p${Tag}.${I["length"]} = getelementptr inbounds i64, ptr ${Base}, i64 ${I["length"]}\n  store i64 ${V}, ptr %p${Tag}.${I["length"]}\n`>
    : Acc;

type ElemKind = { req: "i64 0"; opt: "i64 1"; rest: "i64 2" };
type GenTuple<Es extends any[], P extends string, C extends Ctx> =
  Es extends [] ? [`  %r${P} = call i64 @rt_empty_tuple()\n`, `%r${P}`, ""]
  : GenArray<{ [K in keyof Es]: Es[K][1] }, P, C, "v"> extends [infer A extends string, infer D extends string]
    ? [`${A}  %r${P} = call i64 @rt_tupled(ptr @"t.${C[0]}${P}", ptr %v${P})\n`,
       `%r${P}`,
       `${D}@"tk.${C[0]}${P}" = internal constant [${Es["length"]} x i64] [${Join<{ [K in keyof Es]: ElemKind[Es[K][0]] }, ", ">}]\n@"t.${C[0]}${P}" = internal constant { i64, ptr, ptr, i64 } { i64 ${Es["length"]}, ptr @"tk.${C[0]}${P}", ptr null, i64 0 }\n`]
    : never;

type GenSet<Xs extends any[], P extends string, C extends Ctx, F extends string> =
  GenArray<Xs, P, C, "v"> extends [infer A extends string, infer D extends string]
    ? [`${A}  %r${P} = call i64 @${F}(ptr %v${P}, i64 ${Xs["length"]})\n`, `%r${P}`, D]
    : never;

type GenTpl<Ts extends string[], Xs extends any[], P extends string, C extends Ctx> =
  GenArray<Xs, P, C, "v"> extends [infer A extends string, infer D extends string]
    ? [`${A}  %r${P} = call i64 @rt_tpl(ptr @"ta.${C[0]}${P}", ptr %v${P}, i64 ${Xs["length"]})\n`, `%r${P}`, `${D}${StrArray<Ts, C, P>}`]
    : never;

// function types: the parameters' types and the return type, made into one
type GenFn<Ps extends any[], R, P extends string, C extends Ctx> =
  GenArray<{ [K in keyof Ps]: Ps[K][1] }, P, C, "v"> extends [infer A extends string, infer D extends string]
    ? Gen<R, `${P}.r`, C> extends [infer RA extends string, infer RV extends string, infer RD extends string]
      ? [`${A}${RA}  %r${P} = call i64 @rt_fnty(ptr @"fd.${C[0]}${P}", ptr %v${P}, i64 ${RV})\n`, `%r${P}`,
         `${D}${RD}${FnDesc<Ps, P, C>}`]
      : never
    : never;
type FnDesc<Ps extends any[], P extends string, C extends Ctx> =
  `${Join<{ [K in keyof Ps]: StrDef<Ps[K][0], C, `${P}.n${K & string}`> }>}@"fp.${C[0]}${P}" = internal constant [${Ps["length"]} x { ptr, ptr, i64, i64 }] [${Join<{ [K in keyof Ps]: `{ ptr, ptr, i64, i64 } { ptr ${StrName<C, `${P}.n${K & string}`>}, ptr null, i64 0, i64 ${Ps[K][2] extends true ? 1 : 0} }` }, ", ">}]
@"fd.${C[0]}${P}" = internal constant { i64, ptr, i64 } { i64 ${Ps["length"]}, ptr @"fp.${C[0]}${P}", i64 0 }\n`;

// object types: each property's type a function of the frame, evaluated
// when the property is read
type GenObj<Ps extends any[], P extends string, C extends Ctx> =
  [`  %r${P} = call i64 @rt_obj(ptr @"od.${C[0]}${P}", ptr %env)\n`, `%r${P}`,
   `${Join<{ [K in keyof Ps]: `${StrDef<Ps[K][0], C, `${P}.n${K & string}`>}${Fn<`${C[0]}$op${P}.${K & string}`, Ps[K][1], `${P}.${K & string}`, C>}` }>}@"op.${C[0]}${P}" = internal constant [${Ps["length"] extends 0 ? 1 : Ps["length"]} x { ptr, ptr, i64, i64, i64, i64, i64 }] [${Ps extends [] ? "{ ptr, ptr, i64, i64, i64, i64, i64 } zeroinitializer" : Join<{ [K in keyof Ps]: `{ ptr, ptr, i64, i64, i64, i64, i64 } { ptr ${StrName<C, `${P}.n${K & string}`>}, ptr @"${C[0]}$op${P}.${K & string}", i64 0, i64 -1, i64 ${Ps[K][2] extends true ? 1 : 0}, i64 ${Ps[K][3] extends true ? 1 : 0}, i64 0 }` }, ", ">}]
@"od.${C[0]}${P}" = internal constant { i64, i64, ptr, i64, ptr, i64, ptr } { i64 ${C[5]}, i64 ${Ps["length"]}, ptr @"op.${C[0]}${P}", i64 0, ptr null, i64 0, ptr null }\n`];

// mapped types: the key in its slot; `keyof X` constraints keep X's
// modifiers (homomorphic when X is a type variable)
type GenMapped<X, P extends string, C extends Ctx> =
  X extends ["mapped", string, infer K, infer As, infer B, infer Ro extends number, infer Opt extends number]
    ? WithScope<C, Bind<C, P>> extends infer C2 extends Ctx
      ? (K extends ["keyof", infer T] ? [T, T extends ["ref", infer N extends string, []] ? Slot<C[1], N> : -1] : [null, -1]) extends [infer Of, infer HS extends number]
        ? [`  %r${P} = call i64 @rt_mapped(ptr @"md.${C[0]}${P}", ptr %env)\n`, `%r${P}`,
           `${Of extends null ? Fn<`${C[0]}$mc${P}`, K, `${P}.2`, C> : Fn<`${C[0]}$mo${P}`, Of, `${P}.2.0`, C>}${As extends null ? "" : Fn<`${C[0]}$ma${P}`, As, `${P}.3`, C2>}${Fn<`${C[0]}$mb${P}`, B, `${P}.4`, C2>}@"md.${C[0]}${P}" = internal constant { i64, i64, ptr, ptr, ptr, ptr, ptr, i64, i64, i64, i64, i64, i64 } { i64 ${C[5]}, i64 ${BinderSlot<C, P>}, ptr ${Of extends null ? `@"${C[0]}$mc${P}"` : `@"${C[0]}$mo${P}"`}, ptr ${HS extends -1 ? "null" : `@"${C[0]}$mo${P}"`}, ptr ${Of extends null ? "null" : `@"${C[0]}$mo${P}"`}, ptr ${As extends null ? "null" : `@"${C[0]}$ma${P}"`}, ptr @"${C[0]}$mb${P}", i64 0, i64 -1, i64 ${Ro}, i64 ${Opt}, i64 ${Of extends null ? 0 : 1}, i64 ${HS} }\n`]
        : never
      : never
    : never;

// a table lookup with a default (go2types' dispatch tables): `{ "1": A;
// "2": B } extends infer T ? K extends infer N extends keyof T ? T[N] : D :
// never` is the property K names, else D, found by the runtime
// (rt_dispatch); only that property is evaluated (the others may read a
// heap the program has gone on with)
type GenDispatch<Ps extends any[], K, D, P extends string, C extends Ctx> =
  Gen<K, `${P}.3.0`, C> extends [infer KA extends string, infer KV extends string, infer KD extends string]
    ? Gen<D, `${P}.3.3`, C> extends [infer DA extends string, infer DV extends string, infer DD extends string]
      ? [`${KA}  %i${P} = call i64 @rt_dispatch(i64 ${KV}, ptr @"dd.${C[0]}${P}")
  %n${P} = icmp slt i64 %i${P}, 0
  br i1 %n${P}, label %Ld${P}, label %Lp${P}
Lp${P}:
  %fp${P} = getelementptr inbounds [${Ps["length"]} x ptr], ptr @"dt.${C[0]}${P}", i64 0, i64 %i${P}
  %f${P} = load ptr, ptr %fp${P}
  %c${P} = call { i64, i64 } %f${P}(ptr %env)
  %vp${P} = extractvalue { i64, i64 } %c${P}, 0
  br label %Lj${P}
Ld${P}:
${DA}  br label %Le${P}
Le${P}:
  br label %Lj${P}
Lj${P}:
  %r${P} = phi i64 [ %vp${P}, %Lp${P} ], [ ${DV}, %Le${P} ]
`, `%r${P}`,
         `${KD}${DD}${Join<DispatchFns<Ps, P, C>>}${Join<DispatchNames<Ps, C, P>>}@"dn.${C[0]}${P}" = internal constant [${Ps["length"]} x ptr] [${Join<DispatchNameRefs<Ps, C, P>, ", ">}]
@"dt.${C[0]}${P}" = internal constant [${Ps["length"]} x ptr] [${Join<DispatchFnRefs<Ps, C, P>, ", ">}]
@"dd.${C[0]}${P}" = internal global { i64, ptr, i64, ptr, i64, ptr, ptr } { i64 ${Ps["length"]}, ptr @"dn.${C[0]}${P}", i64 0, ptr null, i64 0, ptr null, ptr null }\n`]
      : never
    : never;
type DispatchFns<Ps extends any[], P extends string, C extends Ctx> = { [K in keyof Ps]: Fn<`${C[0]}$dp${P}.${K & string}`, Ps[K][1], `${P}.0.${K & string}`, C> };
type DispatchNames<Ps extends any[], C extends Ctx, P extends string> = { [K in keyof Ps]: StrDef<Ps[K][0], C, `${P}.dn${K & string}`> };
type DispatchNameRefs<Ps extends any[], C extends Ctx, P extends string> = { [K in keyof Ps]: `ptr ${StrName<C, `${P}.dn${K & string}`>}` };
type DispatchFnRefs<Ps extends any[], C extends Ctx, P extends string> = { [K in keyof Ps]: `ptr @"${C[0]}$dp${P}.${K & string}"` };

// a call of the alias N: a frame at the top of the environment stack with its
// arguments (and the defaults of those not given), then its function
type GenCall<N0 extends string, As extends any[], P extends string, C extends Ctx> =
  (N0 extends keyof C[6] ? C[6][N0] & string : N0) extends infer N extends string
    ? [N] extends [never] ? ["", "18", ""] : GenCallG<N, As, P, C>
    : never;
type GenCallG<N extends string, As extends any[], P extends string, C extends Ctx> =
  [FindDecl<C[2], N>] extends [infer D extends Decl]
    ? GenList<As, P, C> extends [infer A extends string, infer Vs extends string[], infer Ds extends string]
      ? [`${A}  %f${P} = load ptr, ptr @tstc_top\n  %top${P} = getelementptr inbounds i64, ptr %f${P}, i64 ${Frame<D>}\n  store ptr %top${P}, ptr @tstc_top\n${StoreAll<Vs, `%f${P}`, `a${P}`>}${Defaults<D, `%f${P}`, P, { [K in keyof Vs]: 0 }>}  %c${P} = call { i64, i64 } @"${N}"(ptr %f${P})\n  store ptr %f${P}, ptr @tstc_top\n  %r${P} = extractvalue { i64, i64 } %c${P}, 0\n`,
         `%r${P}`, Ds]
      : never
    : ["", "18", ""];

type Defaults<D extends Decl, F extends string, P extends string, I extends 0[]> =
  I["length"] extends D[1]["length"] ? ""
  : `  %dc${P}.${I["length"]} = call { i64, i64 } @"${D[0]}.d${I["length"]}"(ptr ${F})\n  %dv${P}.${I["length"]} = extractvalue { i64, i64 } %dc${P}.${I["length"]}, 0\n  %dp${P}.${I["length"]} = getelementptr inbounds i64, ptr ${F}, i64 ${I["length"]}\n  store i64 %dv${P}.${I["length"]}, ptr %dp${P}.${I["length"]}\n${Defaults<D, F, P, [...I, 0]>}`;

// a function of the frame returning the value of X
type Fn<Name extends string, X, P extends string, C extends Ctx, Linkage extends string = "internal "> =
  Gen<X, P, C> extends [infer A extends string, infer V extends string, infer D extends string]
    ? `${D}define ${Linkage}{ i64, i64 } @"${Name}"(ptr %env) {\nentry:\n${A}  %ret = insertvalue { i64, i64 } { i64 poison, i64 0 }, i64 ${V}, 0\n  ret { i64, i64 } %ret\n}\n`
    : never;

// a conditional is a function of its own (the runtime calls it again for each
// member of a union it distributes over), called where it is
type GenCond<X, P extends string, C extends Ctx> =
  [`  %k${P} = call { i64, i64 } @"${C[0]}$c${P}"(ptr %env)\n  %r${P} = extractvalue { i64, i64 } %k${P}, 0\n`, `%r${P}`, CondFns<X, P, C>];

type CondFns<X, P extends string, C extends Ctx> =
  X extends ["cond", infer A, infer E, infer T, infer F]
    ? Gen<A, `${P}.0`, C> extends [infer CA extends string, infer CV extends string, infer CD extends string]
      ? Binders<E, `${P}.1`> extends infer Is extends [string, string][]
        ? `${CD}${Fn<`${C[0]}$e${P}`, E, `${P}.1`, WithScope<C, Bind<C, `${P}.1`>>>}${Is extends [] ? "" : Pat<E, `${P}.1`, C>}${Fn<`${C[0]}$t${P}`, T, `${P}.2`, WithScope<C, Bind<C, `${P}.1`>>>}${Fn<`${C[0]}$f${P}`, F, `${P}.3`, C>}@"${C[0]}$i${P}" = internal constant [${Plus<Is["length"], 1>} x i64] [${Join<[...{ [K in keyof Is]: `i64 ${BinderSlot<C, Is[K][0]>}` }, "i64 0"], ", ">}]
@"${C[0]}$d${P}" = internal constant { i64, i64, ptr, i64, ptr, ptr, i64, ptr, i64, ptr, i64, ptr } { i64 ${C[5]}, i64 ${A extends ["ref", infer N extends string, []] ? Slot<C[1], N> : -1}, ptr @"${C[0]}$e${P}", i64 0, ptr ${Is extends [] ? "null" : `@"p${C[0]}${P}.1"`}, ptr @"${C[0]}$i${P}", i64 ${Is["length"]}, ptr @"${C[0]}$t${P}", i64 0, ptr @"${C[0]}$f${P}", i64 0, ptr @"${C[0]}$c${P}" }
define internal { i64, i64 } @"${C[0]}$c${P}"(ptr %env) {
entry:
  %out = alloca i64
${CA}  %d = call i64 @rt_cond(ptr @"${C[0]}$d${P}", i64 ${CV}, ptr %env, ptr %out)
  switch i64 %d, label %Lv [ i64 0, label %Lt i64 1, label %Lf ]
Lt:
  %t = musttail call { i64, i64 } @"${C[0]}$t${P}"(ptr %env)
  ret { i64, i64 } %t
Lf:
  %f = musttail call { i64, i64 } @"${C[0]}$f${P}"(ptr %env)
  ret { i64, i64 } %f
Lv:
  %v = load i64, ptr %out
  %rv = insertvalue { i64, i64 } { i64 poison, i64 0 }, i64 %v, 0
  ret { i64, i64 } %rv
}
`
        : never
      : never
    : never;

// the infer pattern of an extends type (desc.h PatD): infers bound to their
// slots, tuples, templates and function types matched part by part, anything
// else as a type
type PD = "{ i64, i64, ptr, i64, i64, ptr, ptr, ptr, ptr, ptr, ptr, i64 }";
type PatName<C extends Ctx, P extends string> = `@"p${C[0]}${P}"`;
// (Imp: the constraint an infer without one has where it is, as TypeScript
// implies it: string in a template's placeholder. A rest element's implied
// unknown[] is left out: what it infers is an array anyway, and checking it
// relates every element of the rest)
type Pat<X, P extends string, C extends Ctx, Imp extends string = "null"> =
  Binders<X, P> extends [] ? PatCode<X, P, C>
  : X extends ["infer", string, infer K]
    ? `${K extends null ? "" : Fn<`${C[0]}$pc${P}`, K, `${P}.2.p`, C>}${PatName<C, P>} = internal constant ${PD} { i64 1, i64 ${BinderSlot<C, P>}, ptr ${K extends null ? Imp : `@"${C[0]}$pc${P}"`}, i64 0, i64 0, ptr null, ptr null, ptr null, ptr null, ptr null, ptr null, i64 0 }\n`
  : X extends ["tuple", infer Es extends any[]]
    ? `${PatTupleElems<Es, P, C>}${PatArray<Es, P, C>}@"pk${C[0]}${P}" = internal constant [${Es["length"]} x i64] [${Join<{ [K in keyof Es]: ElemKind[Es[K][0]] }, ", ">}]
${PatName<C, P>} = internal constant ${PD} { i64 2, i64 0, ptr null, i64 0, i64 ${Es["length"]}, ptr @"pe${C[0]}${P}", ptr @"pk${C[0]}${P}", ptr null, ptr null, ptr null, ptr null, i64 0 }\n`
  : X extends ["tpl", infer Ts extends string[], infer Xs extends any[]]
    ? `${PatElems<Xs, P, C, [], "@tstc0.string">}${PatArray<Xs, P, C>}${StrArray<Ts, C, `${P}.p`>}${PatName<C, P>} = internal constant ${PD} { i64 5, i64 0, ptr null, i64 0, i64 ${Xs["length"]}, ptr @"pe${C[0]}${P}", ptr null, ptr null, ptr null, ptr null, ptr @"ta.${C[0]}${P}.p", i64 0 }\n`
  : X extends ["fn", infer Ps extends any[], infer R]
    ? `${PatFnElems<Ps, P, C>}${PatArray<Ps, P, C>}@"pk${C[0]}${P}" = internal constant [${Ps["length"] extends 0 ? 1 : Ps["length"]} x i64] [${Ps extends [] ? "i64 0" : Join<{ [K in keyof Ps]: Ps[K][2] extends true ? "i64 2" : "i64 0" }, ", ">}]
${Pat<R, `${P}.r`, C>}${PatName<C, P>} = internal constant ${PD} { i64 6, i64 0, ptr null, i64 0, i64 ${Ps["length"]}, ptr @"pe${C[0]}${P}", ptr @"pk${C[0]}${P}", ptr ${PatName<C, `${P}.r`>}, ptr null, ptr null, ptr null, i64 0 }\n`
  : X extends ["obj", infer Ps extends any[]]
    ? `${PatElems<{ [K in keyof Ps]: Ps[K][1] }, P, C>}${PatArray<Ps, P, C>}${Join<{ [K in keyof Ps]: StrDef<Ps[K][0], C, `${P}.pn${K & string}`> }>}@"pn${C[0]}${P}" = internal constant [${Ps["length"]} x ptr] [${Join<{ [K in keyof Ps]: `ptr ${StrName<C, `${P}.pn${K & string}`>}` }, ", ">}]
@"po${C[0]}${P}" = internal constant [${Ps["length"]} x i64] [${Join<{ [K in keyof Ps]: Ps[K][2] extends true ? "i64 1" : "i64 0" }, ", ">}]
${PatName<C, P>} = internal constant ${PD} { i64 4, i64 0, ptr null, i64 0, i64 ${Ps["length"]}, ptr @"pe${C[0]}${P}", ptr null, ptr null, ptr @"pn${C[0]}${P}", ptr @"po${C[0]}${P}", ptr null, i64 0 }\n`
  : PatCode<X, P, C>;
// (the extends type's function makes the same nodes: the pattern's own
// copies are named apart, under the path's ".p")
type PatCode<X, P extends string, C extends Ctx> =
  `${Fn<`${C[0]}$pv${P}`, X, `${P}.p`, C>}${PatName<C, P>} = internal constant ${PD} { i64 0, i64 0, ptr @"${C[0]}$pv${P}", i64 0, i64 0, ptr null, ptr null, ptr null, ptr null, ptr null, ptr null, i64 0 }\n`;
type PatElems<Xs extends any[], P extends string, C extends Ctx, I extends 0[] = [], Imp extends string = "null", Acc extends string = ""> =
  Xs extends [infer A, ...infer R] ? PatElems<R, P, C, [...I, 0], Imp, `${Acc}${Pat<A, `${P}.${I["length"]}`, C, Imp>}`> : Acc;
type PatTupleElems<Es extends any[], P extends string, C extends Ctx> = PatElems<{ [K in keyof Es]: Es[K][1] }, P, C>;
type PatFnElems<Ps extends any[], P extends string, C extends Ctx> = PatElems<{ [K in keyof Ps]: Ps[K][1] }, P, C>;
type PatArray<Xs extends any[], P extends string, C extends Ctx> =
  `@"pe${C[0]}${P}" = internal constant [${Xs["length"]} x ptr] [${Join<{ [K in keyof Xs]: `ptr ${PatName<C, `${P}.${K & string}`>}` }, ", ">}]\n`;

// ---------------------------------------------------------------------------
// An alias: its function (the body), one per default, and its entry for the
// runtime's command line (arguments given, then the defaults)

type CtxOf<D extends Decl, Ds, Names> =
  [D[0], Params<D[1]>, Ds, Binders<D[2], ".b">, D[1]["length"], Frame<D>, D[3] extends keyof Names ? Names[D[3]] : {}];
type Params<Ps extends [string, any][], I extends 0[] = []> =
  Ps extends [[infer N extends string, any], ...infer R extends [string, any][]] ? [[N, I["length"]], ...Params<R, [...I, 0]>] : [];

type AliasIR<D extends Decl, Ds, Names, Id extends string, Eff> =
  CtxOf<D, Ds, Names> extends infer C extends Ctx
    ? IsNative<D> extends true
      ? `${Fn<`${D[0]}$def`, D[2], ".b", C>}${NativeBody<D>}${Plain<D>}${DefaultFns<D, C>}${Wrapper<D>}`
      : D[5] extends "" ? `${Fn<`${D[0]}$body`, D[2], ".b", C>}${D[0] extends keyof Eff ? Plain<D> : Memo<D, Id>}${DefaultFns<D, C>}${Wrapper<D>}`
      : `${Fn<`${D[0]}$body`, D[2], ".b", C>}${Caught<D, C>}${DefaultFns<D, C>}${Wrapper<D>}`
    : never;
type IsNative<D extends Decl> = D[4] extends "" ? false : BaseName<D[3]> extends keyof LibHashes ? D[4] extends LibNatives ? true : false : false;
// `@catch H`: the body runs under tstc_try (rt/try.c); a failure (a native's
// Panic<M>) in it makes the alias H<M, S> instead, S the store's current
// version (H's entry for the runtime's command line takes them)
type Caught<D extends Decl, C extends Ctx> =
  (D[5] extends keyof C[6] ? C[6][D[5]] & string : D[5]) extends infer H extends string
    ? FindDecl<C[2], H> extends infer HD extends Decl
      ? `define internal { i64, i64 } @"${D[0]}"(ptr %env) {
entry:
  %c = call { i64, i64 } @tstc_try(ptr @"${D[0]}$body", ptr @"${H}.w", i64 ${HD[1]["length"]}, ptr %env, i64 0, i64 0, i64 0, i64 0, i64 0)
  ret { i64, i64 } %c
}
`
      : Plain<D>
    : never;
// an alias not looked up in the memo table: its body
type Plain<D extends Decl> = `define internal { i64, i64 } @"${D[0]}"(ptr %env) {
entry:
  %c = musttail call { i64, i64 } @"${D[0]}$body"(ptr %env)
  ret { i64, i64 } %c
}
`;
// Aliases that can reach a native with effects (a store threaded through
// them and updated in place, output, processes) are not memoized: a lookup
// would hand back a store an earlier call went on with, and effects must
// happen again (as the MoonBit tstc plans its memo). The least fixed point
// of "calls one of them", from the natives.
type EffectNatives = "hget" | "hset" | "hgetf" | "hsetf" | "hgets" | "hsets" | "halloc" | "hinit" | "hcopy" | "hloadt" | "hstoret" | "salloc" | "sappend" | "sappendv" | "scopy" | "sclear" | "sswap" | "bytes2s" | "ptrstr" | "s2bytes" | "runes2sl" | "s2runesl" | "srange" | "snext" | "bstr" | "bappend" | "write_out" | "fork" | "wait" | "exit" | "crash_note" | "clock_ms" | "cell_pmap_get" | "cell_pmap_put" | "cell_pmap_del" | "cell_pmap_len" | "cell_pmap_keys" | "cell_pmap_step";
type EffectSet<Ds extends Decl[], Names> = EffectStep<Ds, Names, EffSeed<Ds>>;
type EffSeed<Ds extends Decl[]> = { [I in keyof Ds as I extends `${number}` ? (IsNative<Ds[I]> extends true ? (Ds[I][4] extends EffectNatives ? Ds[I][0] : never) : never) : never]: 1 };
type EffectStep<Ds extends Decl[], Names, E> =
  EffNext<Ds, Names, E> extends infer E2 ? (keyof E2 extends keyof E ? E : EffectStep<Ds, Names, E2>) : never;
type EffNext<Ds extends Decl[], Names, E> = Flat<E & { [I in keyof Ds as I extends `${number}` ? ([Callees<Ds[I], Names> & keyof E] extends [never] ? never : Ds[I][0]) : never]: 1 }>;
// the aliases a declaration's body names, as its file resolves them
type Callees<D, Names> = D extends Decl ? Resolve<RefNames<D[2]>, D[3] extends keyof Names ? Names[D[3]] : {}> : never;
type Resolve<N, M> = N extends keyof M ? M[N] : N;
type RefNames<X> = X extends ["ref", infer N, infer As] ? N | RefNames<As> : X extends [infer H, ...infer R] ? RefNames<H> | RefNames<R> : never;

// ---------------------------------------------------------------------------
// Natives: an alias of tstst's lib/pure tagged `@native name` is the
// runtime's n_name, while the lib's files in the program are the versions
// the natives were checked against (their FNV-1a hashes, as the MoonBit tstc
// checks them); otherwise its definition.

type LibHashes = {
  "float.ts": "5712411105102384201"; "go.ts": "5160468277790861014"; "gort.ts": "2680261447692585256";
  "heap.ts": "940415589675261843"; "int.ts": "-6424677977165027"; "map.ts": "-653147424055246936";
  "misc.ts": "-17566272838564479"; "rterr.ts": "5335410618643360334"; "softfloat.ts": "-2618646305736984855";
  "str.ts": "541375017417051346"; "tables.ts": "-1180400605690907689" };
// what the runtime implements (the MoonBit tstc's lib_native_names: a tag
// naming anything else, e.g. the goroutine scheduling its compiler handles
// itself, keeps the definition)
type LibNatives = "iadd" | "isub" | "imul" | "idiv" | "irem" | "iand" | "ior" | "ixor" | "iandnot" | "ishl" | "ishr" | "iushr" | "ineg" | "inot" | "ieq" | "ine" | "ilt" | "ile" | "igt" | "ige" | "iult" | "iule" | "iugt" | "iuge" | "iwrap" | "i2f" | "u2f" | "f2i" | "f2u" | "fadd" | "fsub" | "fmul" | "fdiv" | "feq" | "flt" | "fle" | "fneg" | "fne" | "slen" | "sat" | "sslice" | "scat" | "seq" | "scmp" | "slt" | "runestr" | "decoderune" | "vnew" | "vget" | "pmap_empty" | "hget" | "hset" | "halloc" | "panic" | "tset" | "tget" | "itoa" | "bnot" | "geq" | "gne" | "udiv" | "urem" | "f2bits" | "bits2f" | "fround32" | "uitoa" | "ffloor" | "fsqrt" | "isnan" | "ftoa" | "sappend" | "scopy" | "salloc" | "hinit" | "sidx" | "reslice" | "aslice" | "bytes2s" | "s2bytes" | "runes2sl" | "s2runesl" | "srange" | "snext" | "sindexbyte" | "sindex" | "scountbyte" | "sswap" | "ptrstr" | "sdata" | "f32bits" | "bits2f32" | "sclear" | "padd" | "hcopy" | "hloadt" | "hstoret" | "shash128" | "shash64" | "write_out" | "fork" | "wait" | "exit" | "crash_note" | "nilchk" | "ta1" | "ta2" | "bytestr" | "bstr" | "bappend" | "clock_ms" | "rterr" | "rtok" | "hgetf" | "hsetf" | "hgets" | "hsets" | "pmap_get" | "pmap_put" | "pmap_del" | "pmap_len" | "pmap_keys" | "pmap_step" | "cell_pmap_get" | "cell_pmap_put" | "cell_pmap_del" | "cell_pmap_len" | "cell_pmap_keys" | "cell_pmap_step" | "sappendv";
// natives returning two results (the runtime's VPair)
type PairNatives = "halloc" | "salloc" | "sappend" | "sappendv" | "scopy" | "s2bytes" | "s2runesl" | "ta2" | "srange"
  | "decoderune" | "shash128" | "clock_ms" | "pmap_get" | "cell_pmap_get";
type BaseName<P extends string> = P extends `${string}/${infer R}` ? BaseName<R> : P;
type NativeBody<D extends Decl> =
  `${D[4] extends PairNatives ? `declare { i64, i64 } @n_${D[4]}(` : `declare i64 @n_${D[4]}(`}${Join<ArgTypes<D[1]>, ", ">})
define internal { i64, i64 } @"${D[0]}$body"(ptr %env) {
entry:
  %ok = call i1 @tstc0.libok()
  br i1 %ok, label %N, label %D
N:
${Join<ArgLoads<D[1]>>}${D[4] extends PairNatives
  ? `  %p = call { i64, i64 } @n_${D[4]}(${Join<ArgRefs<D[1]>, ", ">})
  %p0 = extractvalue { i64, i64 } %p, 0
  %p1 = extractvalue { i64, i64 } %p, 1
  %v = call i64 @tstc0.box(i64 %p0, i64 %p1)`
  : `  %v = call i64 @n_${D[4]}(${Join<ArgRefs<D[1]>, ", ">})`}
  %r = insertvalue { i64, i64 } { i64 poison, i64 0 }, i64 %v, 0
  ret { i64, i64 } %r
D:
  %d = musttail call { i64, i64 } @"${D[0]}$def"(ptr %env)
  ret { i64, i64 } %d
}
`;
// (mapped over a parameter: tuples map to tuples)
type ArgTypes<Ps extends any[]> = { [K in keyof Ps]: "i64" };
type ArgLoads<Ps extends any[]> = { [K in keyof Ps]: `  %g${K & string} = getelementptr inbounds i64, ptr %env, i64 ${K & string}\n  %a${K & string} = load i64, ptr %g${K & string}\n` };
type ArgRefs<Ps extends any[]> = { [K in keyof Ps]: `i64 %a${K & string}` };
// whether the lib's files in the program are the checked versions: their
// texts (bytes) hashed once, at the first native call
type LibCheck<Srcs extends [string, string][]> =
  LibSrcs<Srcs> extends infer L extends [string, string][] ? `${Join<{ [K in keyof L]: `@"src.${K & string}" = private constant [${Len<L[K][1]>} x i8] c"${U8<L[K][1]>}"\n` }>}@tstc0.libst = internal global i8 0
define internal i1 @tstc0.libok() {
entry:
  %st = load i8, ptr @tstc0.libst
  %known = icmp ne i8 %st, 0
  br i1 %known, label %K, label %C
K:
  %okk = icmp eq i8 %st, 1
  ret i1 %okk
C:
${Join<{ [K in keyof L]: `  %h${K & string} = call i64 @tstc0.fnv(ptr @"src.${K & string}", i64 ${Len<L[K][1]>})\n  %e${K & string} = icmp eq i64 %h${K & string}, ${BaseName<L[K][0]> extends keyof LibHashes ? LibHashes[BaseName<L[K][0]>] : "0"}\n` }>}${AndChain<{ [K in keyof L]: `%e${K & string}` }>}
  %stv = select i1 %all, i8 1, i8 2
  store i8 %stv, ptr @tstc0.libst
  ret i1 %all
}
` : never;
type AndChain<Es extends string[], I extends 0[] = [], Prev extends string = "1"> =
  Es extends [infer E extends string, ...infer R extends string[]]
    ? `  %and${I["length"]} = and i1 ${Prev}, ${E}\n${AndChain<R, [...I, 0], `%and${I["length"]}`>}`
    : `  %all = and i1 ${Prev}, 1\n`;
type LibSrcs<Srcs extends [string, string][]> =
  { [K in keyof Srcs]: Srcs[K] } extends infer A extends [string, string][] ? FilterLib<A> : never;
type FilterLib<A extends [string, string][], Acc extends [string, string][] = []> =
  A extends [infer H extends [string, string], ...infer R extends [string, string][]]
    ? FilterLib<R, BaseName<H[0]> extends keyof LibHashes ? [...Acc, H] : Acc> : Acc;
// a file's bytes (its code units below 256) in an LLVM string constant
type U8<S extends string, Acc extends string = ""> =
  S extends `${infer C}${infer R}` ? U8<R, `${Acc}${C extends keyof LLChar ? LLChar[C] : "?"}`> : Acc;
// an alias looks its arguments up in the runtime's memo table (evaluation
// is pure), then evaluates its body
type Memo<D extends Decl, Id extends string> = `define internal { i64, i64 } @"${D[0]}"(ptr %env) {
entry:
  %key = alloca i64
  %m = call i64 @rt_memo_get(i64 ${Id}, ptr %env, i64 ${D[1]["length"]}, ptr %key)
  %hit = icmp ne i64 %m, 0
  br i1 %hit, label %H, label %M
H:
  %rh = insertvalue { i64, i64 } { i64 poison, i64 0 }, i64 %m, 0
  ret { i64, i64 } %rh
M:
  %c = call { i64, i64 } @"${D[0]}$body"(ptr %env)
  %v = extractvalue { i64, i64 } %c, 0
  %k = load i64, ptr %key
  call void @rt_memo_put(i64 %k, i64 %v)
  ret { i64, i64 } %c
}
`;
type DefaultFns<D extends Decl, C extends Ctx, I extends 0[] = []> =
  I["length"] extends D[1]["length"] ? ""
  : D[1][I["length"]] extends [string, infer X]
    ? `${Fn<`${D[0]}.d${I["length"]}`, X extends null ? ["kw", "unknown"] : X, `.d${I["length"]}`, C>}${DefaultFns<D, C, [...I, 0]>}`
    : "";
type Wrapper<D extends Decl> = `define internal i64 @"${D[0]}.w"(ptr %args, i64 %n) {
entry:
  %f = load ptr, ptr @tstc_top
  %top = getelementptr inbounds i64, ptr %f, i64 ${Frame<D>}
  store ptr %top, ptr @tstc_top
${WrapArgs<D>}  %c = call { i64, i64 } @"${D[0]}"(ptr %f)
  store ptr %f, ptr @tstc_top
  %r = extractvalue { i64, i64 } %c, 0
  ret i64 %r
}
`;
type WrapArgs<D extends Decl, I extends 0[] = []> =
  I["length"] extends D[1]["length"] ? ""
  : `  %h${I["length"]} = icmp slt i64 ${I["length"]}, %n
  br i1 %h${I["length"]}, label %G${I["length"]}, label %D${I["length"]}
G${I["length"]}:
  %ap${I["length"]} = getelementptr inbounds i64, ptr %args, i64 ${I["length"]}
  %av${I["length"]} = load i64, ptr %ap${I["length"]}
  br label %S${I["length"]}
D${I["length"]}:
  %dc${I["length"]} = call { i64, i64 } @"${D[0]}.d${I["length"]}"(ptr %f)
  %dv${I["length"]} = extractvalue { i64, i64 } %dc${I["length"]}, 0
  br label %S${I["length"]}
S${I["length"]}:
  %x${I["length"]} = phi i64 [ %av${I["length"]}, %G${I["length"]} ], [ %dv${I["length"]}, %D${I["length"]} ]
  %xp${I["length"]} = getelementptr inbounds i64, ptr %f, i64 ${I["length"]}
  store i64 %x${I["length"]}, ptr %xp${I["length"]}
${WrapArgs<D, [...I, 0]>}`;

// ---------------------------------------------------------------------------
// The program, after the global aliases of TypeScript's lib

type Prelude = `
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type NonNullable<T> = T & {};
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T> = T extends (...args: any) => infer R ? R : any;
type NoInfer<T> = T;
`;

type Module<Ds extends Decl[], Names, MainFile extends string, Srcs extends [string, string][]> = `; generated by tstc0
declare i64 @rt_tuple1(i64)
declare i64 @rt_tuple2(i64, i64)
define internal i64 @tstc0.box(i64 %a, i64 %b) {
entry:
  %z = icmp eq i64 %b, 0
  br i1 %z, label %A, label %P
A:
  ret i64 %a
P:
  %one = icmp eq i64 %b, 4
  br i1 %one, label %O, label %T
O:
  %t1 = call i64 @rt_tuple1(i64 %a)
  ret i64 %t1
T:
  %t2 = call i64 @rt_tuple2(i64 %a, i64 %b)
  ret i64 %t2
}
define internal i64 @tstc0.fnv(ptr %p, i64 %n) {
entry:
  br label %L
L:
  %i = phi i64 [ 0, %entry ], [ %i2, %B ]
  %h = phi i64 [ -3750763034362895579, %entry ], [ %h2, %B ]
  %c = icmp ult i64 %i, %n
  br i1 %c, label %B, label %E
B:
  %q = getelementptr inbounds i8, ptr %p, i64 %i
  %b = load i8, ptr %q
  %bz = zext i8 %b to i64
  %x = xor i64 %h, %bz
  %h2 = mul i64 %x, 1099511628211
  %i2 = add i64 %i, 1
  br label %L
E:
  ret i64 %h
}
${LibCheck<Srcs>}
@tstc_top = external global ptr
declare i64 @mk_num(double)
declare i64 @mk_bigint_text(ptr)
declare i64 @rt_union2(i64, i64)
declare i64 @rt_union(ptr, i64)
declare i64 @rt_inter(ptr, i64)
declare i64 @rt_array(i64, i64)
declare i64 @rt_index(i64, i64)
declare i64 @rt_keyof(i64)
declare i64 @rt_empty_tuple()
declare i64 @rt_tupled(ptr, ptr)
declare i64 @rt_tpl(ptr, ptr, i64)
declare i64 @rt_fnty(ptr, ptr, i64)
declare i64 @rt_obj(ptr, ptr)
declare i64 @rt_mapped(ptr, ptr)
declare i64 @string_mapping(i32, i64)
declare i64 @rt_cond(ptr, i64, ptr, ptr)
declare i64 @rt_dispatch(i64, ptr)
declare { i64, i64 } @tstc_try(ptr, ptr, i64, ptr, i64, i64, i64, i64, i64)
declare i64 @rt_memo_get(i64, ptr, i64, ptr)
declare void @rt_memo_put(i64, i64)
define internal { i64, i64 } @tstc0.string(ptr %env) {
  ret { i64, i64 } { i64 26, i64 0 }
}

${DeclMap<Ds> extends infer M ? EffectSet<Ds, Names> extends infer Eff ? Join<{ [K in keyof Ds]: AliasIR<Ds[K], M, Names, K & string, Eff> }> : never : never}${Join<{ [K in keyof Ds]: `@"n.${Ds[K][0]}" = private constant [${Plus<Len<Ds[K][0]>, 1>} x i8] ${CStr<Ds[K][0]>}\n` }>}@"tstc$entries" = constant [${Ds["length"]} x { ptr, ptr, i64 }] [${Join<{ [K in keyof Ds]: `{ ptr, ptr, i64 } { ptr @"n.${Ds[K][0]}", ptr @"${Ds[K][0]}.w", i64 ${Ds[K][1]["length"]} }` }, ", ">}]
@tstc_entries = constant ptr @"tstc$entries"
@tstc_nentries = constant i64 ${Ds["length"]}
${DumpList<Ds, MainFile> extends infer L extends string[] ? `@"tstc$dump" = constant [${L["length"]} x i64] [${Join<L, ", ">}]
@tstc_dump = constant ptr @"tstc$dump"
@tstc_ndump = constant i64 ${L["length"]}` : never}
@tstc_store = constant { i64, i64 } zeroinitializer
@tstc_cov_names = constant ptr null
@tstc_cov_n = constant i64 0
`;
// (the aliases of the program's own file)
type DumpList<Ds extends Decl[], F extends string, I extends 0[] = []> =
  Ds extends [infer D extends Decl, ...infer R extends Decl[]]
    ? D[1] extends [] ? D[3] extends F ? [`i64 ${I["length"]}`, ...DumpList<R, F, [...I, 0]>] : DumpList<R, F, [...I, 0]> : DumpList<R, F, [...I, 0]>
    : [];

// ---------------------------------------------------------------------------
// Files: the input is one program, or a pack of files, each "\u0000path\u0000"
// and its text (the program first). An import's path is relative to its
// file's directory, without ".ts".

type Unpack<S extends string> =
  S extends `\u0000${infer P}\u0000${infer R}` ? (R extends `${infer T}\u0000${infer R2}` ? [[P, T], ...Unpack<`\u0000${R2}`>] : [[P, R]])
  : [["main.ts", S]];
type Segs<S extends string> = S extends `${infer A}/${infer B}` ? [A, ...Segs<B>] : [S];
type NormSegs<L extends string[], Acc extends string[] = []> =
  L extends [infer H extends string, ...infer R extends string[]]
    ? H extends "." | "" ? NormSegs<R, Acc>
    : H extends ".." ? (Acc extends [...infer P extends string[], string] ? NormSegs<R, P> : NormSegs<R, [...Acc, ".."]>)
    : NormSegs<R, [...Acc, H]>
    : Acc;
type DirOf<F extends string> = Segs<F> extends [...infer D extends string[], string] ? Join<D, "/"> : "";
type ResolvePath<F extends string, Spec extends string> = `${Join<NormSegs<Segs<`${DirOf<F>}/${Spec}`>>, "/">}.ts`;

// the parsed files: [path, declarations, imports, re-exports]
type ParseAll<Fs extends [string, string][], I extends 0[] = []> =
  Fs extends [[infer P extends string, infer T extends string], ...infer R extends [string, string][]]
    ? [[P, ...ParseFile<Lex<T>, P, I extends [] | [0] ? "" : `${P}:`>], ...ParseAll<R, [...I, 0]>]
    : [];
// what each file declares, imports and re-exports, by path: [its aliases
// by name, imports, re-exports] (an object: memoized aliases taking it hash
// it by identity, not through every declaration's body)
type InfoOf<Files> = {
  [I in keyof Files as I extends `${number}` ? (Files[I] extends [infer P extends string, any, any, any] ? P : never) : never]:
    Files[I] extends [string, infer Ds extends Decl[], infer Is, infer Rs] ? [LocalNames<Ds>, Is, Rs] : never };
// what a file exports: its aliases and what it re-exports, by name
type Exports<In, P extends string> =
  P extends keyof In ? (In[P] extends [infer L, any, infer Rs extends any[]] ? Flat<L & ReexportNames<In, P, Rs>> : {}) : {};
type LocalNames<Ds extends Decl[]> =
  { [I in keyof Ds as I extends `${number}` ? ShortName<Ds[I][0]> : never]: Ds[I][0] };
type ShortName<N> = N extends `${string}:${infer S}` ? S : N;
type ReexportNames<In, P extends string, Rs extends any[]> =
  { [I in keyof Rs as I extends `${number}` ? Rs[I][0] : never]: Exported<In, ResolvePath<P, Rs[I][2]>, Rs[I][1]> };
type Exported<In, P extends string, N> = Exports<In, P> extends infer E ? N extends keyof E ? E[N] : never : never;
// the names a file sees: its own aliases, its imports, a namespace's members as `ns.name`
type FileNames<In, P extends string> =
  P extends keyof In ? (In[P] extends [infer L, infer Is extends any[], any] ? Flat<L & NamedImports<In, P, Is> & NsImports<In, P, Is>> : {}) : {};
type NamedImports<In, P extends string, Is extends any[]> =
  { [I in keyof Is as I extends `${number}` ? (Is[I] extends ["named", infer L, any, any] ? L : never) : never]:
      Is[I] extends ["named", any, infer Im, infer Spec extends string] ? Exported<In, ResolvePath<P, Spec>, Im> : never };
// (a namespace's members as `ns.name`: few namespaces, so an intersection)
type NsImports<In, P extends string, Is extends any[], Acc = {}> =
  Is extends [infer I, ...infer R extends any[]]
    ? NsImports<In, P, R, I extends ["ns", infer NS extends string, infer Spec extends string]
        ? Acc & (Exports<In, ResolvePath<P, Spec>> extends infer E ? { [K in keyof E as `${NS}.${K & string}`]: E[K] } : never)
        : Acc>
    : Acc;
type NamesOf<Files> = InfoOf<Files> extends infer In ? { [P in keyof In]: FileNames<In, P & string> } : never;
type AllDecls<Files> = Files extends [[string, infer Ds extends Decl[], any, any], ...infer R] ? [...Ds, ...AllDecls<R>] : [];

type Main<Pack extends string = ""> =
  ParseAll<[["<lib>", Prelude], ...Unpack<Pack>]> extends infer Files
    ? Module<AllDecls<Files>, NamesOf<Files>, Unpack<Pack>[0][0], Unpack<Pack>>
    : never;
