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
// \uXXXX of an ASCII character
type Chr = ["\u0000", "\u0001", "\u0002", "\u0003", "\u0004", "\u0005", "\u0006", "\u0007", "\b", "\t", "\n", "\u000b", "\f", "\r", "\u000e", "\u000f", "\u0010", "\u0011", "\u0012", "\u0013", "\u0014", "\u0015", "\u0016", "\u0017", "\u0018", "\u0019", "\u001a", "\u001b", "\u001c", "\u001d", "\u001e", "\u001f", " ", "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?", "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_", "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~", "\u007f"];
type HexVal = { "0": 0; "1": 1; "2": 2; "3": 3; "4": 4; "5": 5; "6": 6; "7": 7; "8": 8; "9": 9; "a": 10; "b": 11; "c": 12; "d": 13; "e": 14; "f": 15; "A": 10; "B": 11; "C": 12; "D": 13; "E": 14; "F": 15 };
type Times16<N extends number> = Plus<Plus<Plus<Plus<N, N>, Plus<N, N>>, Plus<Plus<N, N>, Plus<N, N>>>, Plus<Plus<Plus<N, N>, Plus<N, N>>, Plus<Plus<N, N>, Plus<N, N>>>>;
type HexChar<A extends string, B extends string> =
  A extends keyof HexVal ? B extends keyof HexVal ? Chr[Plus<Times16<HexVal[A]>, HexVal[B]>] : "?" : "?";

type Lex<S extends string, Acc extends Tok[] = [], St extends (0 | 1)[] = []> =
  S extends `${infer C}${infer R}`
    ? C extends Space ? Lex<R, Acc, St>
    : S extends `//${string}\n${infer R2}` ? Lex<R2, Acc, St>
    : S extends `/*${string}*/${infer R2}` ? Lex<R2, Acc, St>
    : C extends Alpha ? LexWord<R, C, Acc, St>
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

type LexStr<S extends string, Q extends string, T extends string, Acc extends Tok[], St extends (0 | 1)[]> =
  S extends `${infer C}${infer R}`
    ? C extends Q ? Lex<R, [...Acc, ["str", T]], St>
    : C extends "\\" ? (R extends `u00${infer A}${infer B}${infer R2}` ? LexStr<R2, Q, `${T}${HexChar<A, B>}`, Acc, St>
      : R extends `${infer E}${infer R2}` ? LexStr<R2, Q, `${T}${Unescape<E>}`, Acc, St> : Acc)
    : LexStr<R, Q, `${T}${C}`, Acc, St>
    : Acc;

// a template's text up to its end (Full, or End after a hole) or a hole
// (Start, or Mid after one)
type LexTpl<S extends string, T extends string, Acc extends Tok[], St extends (0 | 1)[], End extends string, Hole extends string> =
  S extends `\`${infer R}` ? Lex<R, [...Acc, [End, T]], St>
  : S extends `\${${infer R}` ? Lex<R, [...Acc, [Hole, T]], [...St, 1]>
  : S extends `\\u00${infer A}${infer B}${infer R}` ? LexTpl<R, `${T}${HexChar<A, B>}`, Acc, St, End, Hole>
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

type Decl = [string, [string, any][], any];

type ParseDecls<T, Acc extends Decl[] = []> =
  T extends [["id", "export"], ...infer R] ? ParseDecls<R, Acc>
  : T extends [["id", "type"], ["id", infer N extends string], ...infer R]
    ? ParseParams<R> extends [infer Ps extends [string, any][], [["=", "="], ...infer R2]]
      ? ParseType<R2> extends [infer B, infer R3]
        ? ParseDecls<R3 extends [[";", ";"], ...infer R4] ? R4 : R3, [...Acc, [N, Ps, B]]>
        : Acc
      : Acc
  : Acc;

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
type Join<L extends string[], Sep extends string = ""> =
  L extends [infer H extends string] ? H
  : L extends [infer H extends string, ...infer R extends string[]] ? `${H}${Sep}${Join<R, Sep>}` : "";

// UTF-16 code units of ASCII text, as an LLVM string constant's bytes
type U16<S extends string, Acc extends string = ""> =
  S extends `${infer C}${infer R}` ? U16<R, `${Acc}${C extends keyof LLChar ? LLChar[C] : "?"}\\00`> : Acc;
type CStr<S extends string> = `c"${S}\\00"`;
type LLChar = { "\u0000": "\\00"; "\u0001": "\\01"; "\u0002": "\\02"; "\u0003": "\\03"; "\u0004": "\\04"; "\u0005": "\\05"; "\u0006": "\\06"; "\u0007": "\\07"; "\b": "\\08"; "\t": "\\09"; "\n": "\\0A"; "\u000b": "\\0B"; "\f": "\\0C"; "\r": "\\0D"; "\u000e": "\\0E"; "\u000f": "\\0F"; "\u0010": "\\10"; "\u0011": "\\11"; "\u0012": "\\12"; "\u0013": "\\13"; "\u0014": "\\14"; "\u0015": "\\15"; "\u0016": "\\16"; "\u0017": "\\17"; "\u0018": "\\18"; "\u0019": "\\19"; "\u001a": "\\1A"; "\u001b": "\\1B"; "\u001c": "\\1C"; "\u001d": "\\1D"; "\u001e": "\\1E"; "\u001f": "\\1F"; " ": " "; "!": "!"; "\"": "\\22"; "#": "#"; "$": "$"; "%": "%"; "&": "&"; "'": "'"; "(": "("; ")": ")"; "*": "*"; "+": "+"; ",": ","; "-": "-"; ".": "."; "/": "/"; "0": "0"; "1": "1"; "2": "2"; "3": "3"; "4": "4"; "5": "5"; "6": "6"; "7": "7"; "8": "8"; "9": "9"; ":": ":"; ";": ";"; "<": "<"; "=": "="; ">": ">"; "?": "?"; "@": "@"; "A": "A"; "B": "B"; "C": "C"; "D": "D"; "E": "E"; "F": "F"; "G": "G"; "H": "H"; "I": "I"; "J": "J"; "K": "K"; "L": "L"; "M": "M"; "N": "N"; "O": "O"; "P": "P"; "Q": "Q"; "R": "R"; "S": "S"; "T": "T"; "U": "U"; "V": "V"; "W": "W"; "X": "X"; "Y": "Y"; "Z": "Z"; "[": "["; "\\": "\\5C"; "]": "]"; "^": "^"; "_": "_"; "`": "`"; "a": "a"; "b": "b"; "c": "c"; "d": "d"; "e": "e"; "f": "f"; "g": "g"; "h": "h"; "i": "i"; "j": "j"; "k": "k"; "l": "l"; "m": "m"; "n": "n"; "o": "o"; "p": "p"; "q": "q"; "r": "r"; "s": "s"; "t": "t"; "u": "u"; "v": "v"; "w": "w"; "x": "x"; "y": "y"; "z": "z"; "{": "{"; "|": "|"; "}": "}"; "~": "~"; "\u007f": "\\7F" };

// ---------------------------------------------------------------------------
// Code generation. Ctx: [alias, scope [[name, slot]...], decls, binders
// [[path, name]...] (infers and mapped types' keys), params, frame].
// Gen<node, path, ctx> is [instructions, register, definitions]; names of
// registers and globals are made of the node's path.

type Ctx = [string, [string, number][], any, [string, string][], number, number];
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
type DeclMap<Ds, Acc = {}> =
  Ds extends [infer D extends Decl, ...infer R] ? DeclMap<R, Acc & { [K in D[0]]: D }> : Flat<Acc>;
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
type BinderSlot<C extends Ctx, Q extends string> = Plus<C[4], IndexOf<Q, PathsOf<C[3]>> & number>;
type PathsOf<L extends [string, string][]> = { [K in keyof L]: L[K][0] };
// the binders declared in the subtree at P, in scope
type Bind<C extends Ctx, P extends string, L extends [string, string][] = C[3]> =
  L extends [[infer Q extends string, infer N extends string], ...infer R extends [string, string][]]
    ? Q extends P | `${P}.${string}` ? [[N, BinderSlot<C, Q>], ...Bind<C, P, R>] : Bind<C, P, R>
    : [];
type WithScope<C extends Ctx, S extends [string, number][]> = [C[0], [...C[1], ...S], C[2], C[3], C[4], C[5]];

type Gen<X, P extends string, C extends Ctx> =
  X extends ["num", infer T extends string] ? [`  %r${P} = call i64 @mk_num(double ${T extends `${string}.${string}` ? T : `${T}.0`})\n`, `%r${P}`, ""]
  : X extends ["big", infer T extends string] ? [`  %s${P} = shl i64 ${T}, 1\n  %r${P} = or i64 %s${P}, 1\n`, `%r${P}`, ""]
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
  : X extends ["cond", any, any, any, any] ? GenCond<X, P, C>
  : X extends ["infer", any, any] ? GenLoad<BinderSlot<C, P>, P>
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

type StoreAll<Vs extends string[], Base extends string, Tag extends string, I extends 0[] = []> =
  Vs extends [infer V extends string, ...infer R extends string[]]
    ? `  %p${Tag}.${I["length"]} = getelementptr inbounds i64, ptr ${Base}, i64 ${I["length"]}\n  store i64 ${V}, ptr %p${Tag}.${I["length"]}\n${StoreAll<R, Base, Tag, [...I, 0]>}`
    : "";

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

// a call of the alias N: a frame at the top of the environment stack with its
// arguments (and the defaults of those not given), then its function
type GenCall<N extends string, As extends any[], P extends string, C extends Ctx> =
  FindDecl<C[2], N> extends infer D extends Decl
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
  : PatCode<X, P, C>;
// (the extends type's function makes the same nodes: the pattern's own
// copies are named apart, under the path's ".p")
type PatCode<X, P extends string, C extends Ctx> =
  `${Fn<`${C[0]}$pv${P}`, X, `${P}.p`, C>}${PatName<C, P>} = internal constant ${PD} { i64 0, i64 0, ptr @"${C[0]}$pv${P}", i64 0, i64 0, ptr null, ptr null, ptr null, ptr null, ptr null, ptr null, i64 0 }\n`;
type PatElems<Xs extends any[], P extends string, C extends Ctx, I extends 0[] = [], Imp extends string = "null"> =
  Xs extends [infer A, ...infer R] ? `${Pat<A, `${P}.${I["length"]}`, C, Imp>}${PatElems<R, P, C, [...I, 0], Imp>}` : "";
type PatTupleElems<Es extends any[], P extends string, C extends Ctx, I extends 0[] = []> =
  Es extends [[infer K, infer A], ...infer R]
    ? `${Pat<A, `${P}.${I["length"]}`, C>}${PatTupleElems<R, P, C, [...I, 0]>}` : "";
type PatFnElems<Ps extends any[], P extends string, C extends Ctx, I extends 0[] = []> =
  Ps extends [[string, infer A, infer Rest], ...infer R]
    ? `${Pat<A, `${P}.${I["length"]}`, C>}${PatFnElems<R, P, C, [...I, 0]>}` : "";
type PatArray<Xs extends any[], P extends string, C extends Ctx> =
  `@"pe${C[0]}${P}" = internal constant [${Xs["length"]} x ptr] [${Join<{ [K in keyof Xs]: `ptr ${PatName<C, `${P}.${K & string}`>}` }, ", ">}]\n`;

// ---------------------------------------------------------------------------
// An alias: its function (the body), one per default, and its entry for the
// runtime's command line (arguments given, then the defaults)

type CtxOf<D extends Decl, Ds> =
  [D[0], Params<D[1]>, Ds, Binders<D[2], ".b">, D[1]["length"], Frame<D>];
type Params<Ps extends [string, any][], I extends 0[] = []> =
  Ps extends [[infer N extends string, any], ...infer R extends [string, any][]] ? [[N, I["length"]], ...Params<R, [...I, 0]>] : [];

type AliasIR<D extends Decl, Ds, Id extends string> =
  CtxOf<D, Ds> extends infer C extends Ctx
    ? `${Fn<`${D[0]}$body`, D[2], ".b", C>}${Memo<D, Id>}${DefaultFns<D, C>}${Wrapper<D>}`
    : never;
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

type Module<Ds extends Decl[]> = `; generated by tstc0
@tstc_top = external global ptr
declare i64 @mk_num(double)
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
declare i64 @rt_memo_get(i64, ptr, i64, ptr)
declare void @rt_memo_put(i64, i64)
define internal { i64, i64 } @tstc0.string(ptr %env) {
  ret { i64, i64 } { i64 26, i64 0 }
}

${DeclMap<Ds> extends infer M ? Join<{ [K in keyof Ds]: AliasIR<Ds[K], M, K & string> }> : never}${Join<{ [K in keyof Ds]: `@"n.${Ds[K][0]}" = private constant [${Plus<Len<Ds[K][0]>, 1>} x i8] ${CStr<Ds[K][0]>}\n` }>}@"tstc$entries" = constant [${Ds["length"]} x { ptr, ptr, i64 }] [${Join<{ [K in keyof Ds]: `{ ptr, ptr, i64 } { ptr @"n.${Ds[K][0]}", ptr @"${Ds[K][0]}.w", i64 ${Ds[K][1]["length"]} }` }, ", ">}]
@tstc_entries = constant ptr @"tstc$entries"
@tstc_nentries = constant i64 ${Ds["length"]}
${DumpList<Ds> extends infer L extends string[] ? `@"tstc$dump" = constant [${L["length"]} x i64] [${Join<L, ", ">}]
@tstc_dump = constant ptr @"tstc$dump"
@tstc_ndump = constant i64 ${L["length"]}` : never}
@tstc_store = constant { i64, i64 } zeroinitializer
@tstc_cov_names = constant ptr null
@tstc_cov_n = constant i64 0
`;
type DumpList<Ds extends Decl[], I extends 0[] = []> =
  Ds extends [infer D extends Decl, ...infer R extends Decl[]]
    ? D[1] extends [] ? [`i64 ${I["length"]}`, ...DumpList<R, [...I, 0]>] : DumpList<R, [...I, 0]>
    : [];

type Main<Source extends string = ""> = Module<ParseDecls<Lex<`${Prelude}${Source}`>>>;
