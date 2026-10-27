// Go strings in plain TypeScript: a Go string is a string literal type whose
// characters are its bytes (char codes 0-255).
import type { ByteChar, CharByte, Skip100, Skip1000 } from "./tables";
import type { Big, Str, Rev, Panic, iadd, isub, ilt, ige, ile, iand, ior, ishl, iushr } from "./int";
import type { rterr } from "./rterr";

type Dg = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Succ = { "0": "1"; "1": "2"; "2": "3"; "3": "4"; "4": "5"; "5": "6"; "6": "7"; "7": "8"; "8": "9" };
type Pred = { "1": "0"; "2": "1"; "3": "2"; "4": "3"; "5": "4"; "6": "5"; "7": "6"; "8": "7"; "9": "8" };

// counters: reversed decimal digit strings
type Inc<C extends string> =
  C extends `${infer d extends Dg}${infer R}` ? d extends "9" ? `0${Inc<R>}` : `${Succ[d & keyof Succ]}${R}` : "1";
type Counter<N extends bigint> = Rev<Str<N>>;
type CountBig<C extends string> = Big<Rev<C>>;

// ten characters a step while there are ten (C + 10: the counter's tens)
// (every step makes the rest of S a new string type: a long string goes a
// thousand characters a step, then a hundred, ten, one)
type LenLoop<S extends string, C extends string> =
  Skip1000<S> extends infer R extends string ? [R] extends [never] ? LenLoop100<S, C> : LenLoop<R, IncAt<C, "xxx">> : never;
type LenLoop100<S extends string, C extends string> =
  Skip100<S> extends infer R extends string ? [R] extends [never] ? LenLoop10<S, C> : LenLoop100<R, IncAt<C, "xx">> : never;
type LenLoop10<S extends string, C extends string> =
  S extends `${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${infer R}` ? LenLoop10<R, IncAt<C, "x">>
  : S extends `${string}${infer R}` ? LenLoop10<R, Inc<C>> : C;
// counter C plus 10^L (L's length)
type IncAt<C extends string, L extends string> =
  L extends `x${infer L1}` ? C extends `${infer d}${infer CR}` ? `${d}${IncAt<CR, L1>}` : `0${IncAt<"", L1>}` : Inc<C>;
/** @native slen */
export type slen<S> = slen_c<S extends string ? S : never>;
type slen_c<S extends string> = CountBig<LenLoop<S, "0">>;

// S without its first N bytes (N the counter C), or never when S is shorter:
// digit by digit, the digit at level L (L's length) dropping 10^L bytes at a
// time, so that s[i] costs a checker some dozens of steps rather than i
type DropC<S extends string, C extends string, L extends string = ""> =
  C extends `${infer d}${infer R}` ? DropC<DropUnits<S, d, L>, R, `x${L}`> : S;
type DropUnits<S extends string, d extends string, L extends string> =
  d extends "0" ? S : DropUnits<DropUnit<S, L>, Pred[d & keyof Pred], L>;
type DropUnit<S extends string, L extends string> =
  L extends "" ? S extends `${string}${infer R}` ? R : never
  : L extends "x" ? S extends `${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${infer R}` ? R : never
  : L extends "xx" ? Skip100<S>
  : L extends "xxx" ? Skip1000<S>
  : L extends `x${infer L1}` ? DropUnit<DropUnit<DropUnit<DropUnit<DropUnit<DropUnit<DropUnit<DropUnit<DropUnit<DropUnit<S, L1>, L1>, L1>, L1>, L1>, L1>, L1>, L1>, L1>, L1>
  : never;
// the first N bytes of S (N the counter C), or never when S is shorter
type TakeC<S extends string, C extends string> =
  DropC<S, C> extends infer Rest extends string ? [Rest] extends [never] ? never : S extends `${infer P}${Rest}` ? P : never : never;

type IndexErr<I extends bigint, S extends string> = rterr<`index out of range [${I}] with length ${slen<S>}`>;
/** @native sat */
export type sat<S, I> = sat_c<S extends string ? S : never, I extends bigint ? I : never>;
type sat_c<S extends string, I extends bigint> =
  ilt<I, 0n> extends true ? IndexErr<I, S>
  : DropC<S, Counter<I>> extends `${infer X}${string}` ? CharByte[X & keyof CharByte] : IndexErr<I, S>;

type SliceErr<S extends string, Lo extends bigint, Hi extends bigint> =
  rterr<`slice bounds out of range [${Lo}:${Hi}] with length ${slen<S>}`>;
/** @native sslice */
export type sslice<S, Lo, Hi> = sslice_c<S extends string ? S : never, Lo extends bigint ? Lo : never, Hi extends bigint ? Hi : never>;
type sslice_c<S extends string, Lo extends bigint, Hi extends bigint> =
  ilt<Lo, 0n> extends true ? SliceErr<S, Lo, Hi>
  : ilt<Hi, Lo> extends true ? SliceErr<S, Lo, Hi>
  : DropC<S, Counter<Lo>> extends infer T extends string
    ? [T] extends [never] ? SliceErr<S, Lo, Hi> : TakeC<T, Counter<isub<Hi, Lo>>> extends infer R extends string
      ? [R] extends [never] ? SliceErr<S, Lo, Hi> : R
      : never
    : never;

/** @native scat */
export type scat<A, B> = scat_c<A extends string ? A : never, B extends string ? B : never>;
type scat_c<A extends string, B extends string> = `${A}${B}`;
/** @native seq */
export type seq<A, B> = seq_c<A extends string ? A : never, B extends string ? B : never>;
type seq_c<A extends string, B extends string> = [A] extends [B] ? true : false;

// byte-wise comparison: -1n, 0n or 1n
/** @native scmp */
export type scmp<A, B> = scmp_c<A extends string ? A : never, B extends string ? B : never>;
type scmp_c<A extends string, B extends string> =
  [A] extends [B] ? 0n
  : A extends `${infer a}${infer AR}`
    ? B extends `${infer b}${infer BR}`
      ? [a] extends [b] ? scmp<AR, BR> : ilt<CharByte[a & keyof CharByte], CharByte[b & keyof CharByte]> extends true ? -1n : 1n
      : 1n
    : -1n;
/** @native slt */
export type slt<A, B> = slt_c<A extends string ? A : never, B extends string ? B : never>;
type slt_c<A extends string, B extends string> = scmp<A, B> extends -1n ? true : false;

/** @native bytestr */
export type bytestr<C> = bytestr_c<C extends bigint ? C : never>;
type bytestr_c<C extends bigint> = ByteChar[Str<iand<C, 255n>> & keyof ByteChar];
type B<N extends bigint> = ByteChar[Str<N> & keyof ByteChar];

// UTF-8 encoding of a rune; invalid runes encode U+FFFD
/** @native runestr */
export type runestr<R> = runestr_c<R extends bigint ? R : never>;
type runestr_c<R extends bigint> =
  ilt<R, 0n> extends true ? "\xef\xbf\xbd"
  : ilt<R, 0x80n> extends true ? B<R>
  : ilt<R, 0x800n> extends true ? `${B<ior<0xc0n, iushr<R, 6n>>>}${B<ior<0x80n, iand<R, 0x3fn>>>}`
  : ilt<R, 0xd800n> extends true ? Enc3<R>
  : ilt<R, 0xe000n> extends true ? "\xef\xbf\xbd"
  : ilt<R, 0x10000n> extends true ? Enc3<R>
  : ilt<R, 0x110000n> extends true
    ? `${B<ior<0xf0n, iushr<R, 18n>>>}${B<ior<0x80n, iand<iushr<R, 12n>, 0x3fn>>>}${B<ior<0x80n, iand<iushr<R, 6n>, 0x3fn>>>}${B<ior<0x80n, iand<R, 0x3fn>>>}`
  : "\xef\xbf\xbd";
type Enc3<R extends bigint> =
  `${B<ior<0xe0n, iushr<R, 12n>>>}${B<ior<0x80n, iand<iushr<R, 6n>, 0x3fn>>>}${B<ior<0x80n, iand<R, 0x3fn>>>}`;

// continuation byte payload, or -1n
type Cont<S extends string, K extends string> =
  DropC<S, K> extends `${infer X}${string}`
    ? CharByte[X & keyof CharByte] extends infer c extends bigint
      ? iand<c, 0xc0n> extends 0x80n ? iand<c, 0x3fn> : -1n
      : never
    : -1n;

// Go's utf8.DecodeRuneInString of S[I:]: [rune, size]
/** @native decoderune */
export type decoderune<S, I> = decoderune_c<S extends string ? S : never, I extends bigint ? I : never>;
type decoderune_c<S extends string, I extends bigint> =
  DropC<S, Counter<I>> extends infer T extends string
    ? [T] extends [never] ? [0xfffdn, 0n]
    : T extends `${infer X}${string}` ? Decode<T, CharByte[X & keyof CharByte]> : [0xfffdn, 0n]
    : never;

type Decode<T extends string, c0 extends bigint> =
  ilt<c0, 0x80n> extends true ? [c0, 1n]
  : ilt<c0, 0xc2n> extends true ? [0xfffdn, 1n]
  : ilt<c0, 0xe0n> extends true
    ? Cont<T, "1"> extends infer c1 extends bigint
      ? c1 extends -1n ? [0xfffdn, 1n] : [ior<ishl<iand<c0, 0x1fn>, 6n>, c1>, 2n]
      : never
  : ilt<c0, 0xf0n> extends true
    ? [Cont<T, "1">, Cont<T, "2">] extends [infer c1 extends bigint, infer c2 extends bigint]
      ? c1 extends -1n ? [0xfffdn, 1n] : c2 extends -1n ? [0xfffdn, 1n]
      : ior<ior<ishl<iand<c0, 0x0fn>, 12n>, ishl<c1, 6n>>, c2> extends infer r extends bigint
        ? ilt<r, 0x800n> extends true ? [0xfffdn, 1n]
        : ige<r, 0xd800n> extends true ? ile<r, 0xdfffn> extends true ? [0xfffdn, 1n] : [r, 3n]
        : [r, 3n]
        : never
      : never
  : ilt<c0, 0xf5n> extends true
    ? [Cont<T, "1">, Cont<T, "2">, Cont<T, "3">] extends [infer c1 extends bigint, infer c2 extends bigint, infer c3 extends bigint]
      ? c1 extends -1n ? [0xfffdn, 1n] : c2 extends -1n ? [0xfffdn, 1n] : c3 extends -1n ? [0xfffdn, 1n]
      : ior<ior<ishl<iand<c0, 0x07n>, 18n>, ishl<c1, 12n>>, ior<ishl<c2, 6n>, c3>> extends infer r extends bigint
        ? ilt<r, 0x10000n> extends true ? [0xfffdn, 1n] : ilt<r, 0x110000n> extends true ? [r, 4n] : [0xfffdn, 1n]
        : never
      : never
  : [0xfffdn, 1n];

// index of the first byte C in S, or -1n
type IndexLoop<S extends string, X extends string, C extends string> =
  S extends `${infer Y}${infer R}` ? [Y] extends [X] ? CountBig<C> : IndexLoop<R, X, Inc<C>> : -1n;
/** @native sindexbyte */
export type sindexbyte<S, C> = sindexbyte_c<S extends string ? S : never, C extends bigint ? C : never>;
type sindexbyte_c<S extends string, C extends bigint> = IndexLoop<S, bytestr<C>, "0">;

// index of the first occurrence of Sub in S, or -1n (the empty string is at
// 0n: in the pattern below an empty Sub would leave infer Pre next to
// ${string}, and Pre would take one character)
/** @native sindex */
export type sindex<S, Sub> = sindex_c<S extends string ? S : never, Sub extends string ? Sub : never>;
type sindex_c<S extends string, Sub extends string> =
  Sub extends "" ? 0n : S extends `${infer Pre}${Sub}${string}` ? slen<Pre> : -1n;

type CountLoop<S extends string, X extends string, C extends string> =
  S extends `${string}${X}${infer R}` ? CountLoop<R, X, Inc<C>> : CountBig<C>;
/** @native scountbyte */
export type scountbyte<S, C> = scountbyte_c<S extends string ? S : never, C extends bigint ? C : never>;
type scountbyte_c<S extends string, C extends bigint> = CountLoop<S, bytestr<C>, "0">;
