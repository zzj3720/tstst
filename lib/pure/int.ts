// Type-level int64 arithmetic on bigint literal types, in plain TypeScript.
//
// Values are bigint literals in [-2^63, 2^63); uint64 values are stored as
// their two's complement reinterpretation (so 2^64 - 1 is -1n). Arithmetic
// runs on decimal digit strings ("magnitudes": non-negative, no leading
// zeros), bitwise operations on hex digit strings (64 bits: 16 digits), shifts
// on 64-character binary strings.
import type { AddT, AddT1, SubT, SubT1, MulT, CmpT, HalfT, Count, M16T, HexVal, HexBits, BitsHex, AndH, OrH, XorH, AndNotH, NegHexT, Div256T, M256T, HexOfB, ByteOfHex } from "./tables";
import type { rterr } from "./rterr";

type Dg = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export type Rev<S extends string, Acc extends string = ""> =
  S extends `${infer C}${infer R}` ? Rev<R, `${C}${Acc}`> : Acc;

type StripZeros<S extends string> = S extends `0${infer R}` ? (R extends "" ? "0" : StripZeros<R>) : S;

// ---------------------------------------------------------------------------
// magnitudes

// sum of reversed digit strings, as a normal (most significant first) string
type AddRev<A extends string, B extends string, C extends string, Acc extends string> =
  A extends `${infer a extends Dg}${infer AR}`
    ? B extends `${infer b extends Dg}${infer BR}`
      ? (C extends "1" ? AddT1 : AddT)[a][b] extends `${infer c}${infer d}` ? AddRev<AR, BR, c, `${d}${Acc}`> : never
      : (C extends "1" ? AddT1 : AddT)[a]["0"] extends `${infer c}${infer d}` ? AddRev<AR, "", c, `${d}${Acc}`> : never
    : B extends `${infer b extends Dg}${infer BR}`
      ? (C extends "1" ? AddT1 : AddT)["0"][b] extends `${infer c}${infer d}` ? AddRev<"", BR, c, `${d}${Acc}`> : never
      : C extends "1" ? `1${Acc}` : Acc;

export type UAdd<A extends string, B extends string> = AddRev<Rev<A>, Rev<B>, "0", "">;

// A - B for A >= B
type SubRev<A extends string, B extends string, C extends string, Acc extends string> =
  A extends `${infer a extends Dg}${infer AR}`
    ? B extends `${infer b extends Dg}${infer BR}`
      ? (C extends "1" ? SubT1 : SubT)[a][b] extends `${infer c}${infer d}` ? SubRev<AR, BR, c, `${d}${Acc}`> : never
      : (C extends "1" ? SubT1 : SubT)[a]["0"] extends `${infer c}${infer d}` ? SubRev<AR, "", c, `${d}${Acc}`> : never
    : Acc;

export type USub<A extends string, B extends string> = StripZeros<SubRev<Rev<A>, Rev<B>, "0", "">>;

// "lt" | "eq" | "gt": by length first, then digit by digit
type CmpLen<A extends string, B extends string> =
  A extends `${string}${string}${string}${string}${infer AR}`
    ? B extends `${string}${string}${string}${string}${infer BR}` ? CmpLen<AR, BR> : "gt"
  : A extends `${string}${infer AR}`
    ? B extends `${string}${infer BR}` ? CmpLen<AR, BR> : "gt"
    : B extends "" ? "eq" : "lt";

type CmpDigits<A extends string, B extends string> =
  A extends `${infer a extends Dg}${infer AR}`
    ? B extends `${infer b extends Dg}${infer BR}`
      ? CmpT[a][b] extends "eq" ? CmpDigits<AR, BR> : CmpT[a][b]
      : "eq"
    : "eq";

export type UCmp<A extends string, B extends string> =
  CmpLen<A, B> extends "eq" ? CmpDigits<A, B> : CmpLen<A, B>;

// A * d for one digit d, reversed A, carry digit C
type MulDigitRev<A extends string, d extends Dg, C extends string, Acc extends string> =
  A extends `${infer a extends Dg}${infer AR}`
    ? MulT[a][d] extends `${infer h extends Dg}${infer l extends Dg}`
      ? AddT[l][C & Dg] extends `${infer c2}${infer l2}`
        ? MulDigitRev<AR, d, c2 extends "1" ? AddT1[h]["0"] extends `0${infer x}` ? x : never : h, `${l2}${Acc}`>
        : never
      : never
    : C extends "0" ? Acc : `${C}${Acc}`;

type UMulDigit<A extends string, d extends Dg> = d extends "0" ? "0" : StripZeros<MulDigitRev<Rev<A>, d, "0", "">>;

// Products are summed lowest digit first, without reversals: A * d for one
// digit d (A reversed, carry C), lowest digit first
type MulDigitRR<A extends string, d extends Dg, C extends string, Acc extends string> =
  A extends `${infer a extends Dg}${infer AR}`
    ? MulT[a][d] extends `${infer h extends Dg}${infer l extends Dg}`
      ? AddT[l][C & Dg] extends `${infer c2}${infer l2}`
        ? MulDigitRR<AR, d, c2 extends "1" ? AddT1[h]["0"] extends `0${infer x}` ? x : never : h, `${Acc}${l2}`>
        : never
      : never
    : C extends "0" ? Acc : `${Acc}${C}`;
// A + B, both and the sum lowest digit first
type AddRR<A extends string, B extends string, C extends string, Acc extends string> =
  A extends `${infer a extends Dg}${infer AR}`
    ? B extends `${infer b extends Dg}${infer BR}`
      ? (C extends "1" ? AddT1 : AddT)[a][b] extends `${infer c}${infer d}` ? AddRR<AR, BR, c, `${Acc}${d}`> : never
      : (C extends "1" ? AddT1 : AddT)[a]["0"] extends `${infer c}${infer d}` ? AddRR<AR, "", c, `${Acc}${d}`> : never
    : B extends `${infer b extends Dg}${infer BR}`
      ? (C extends "1" ? AddT1 : AddT)["0"][b] extends `${infer c}${infer d}` ? AddRR<"", BR, c, `${Acc}${d}`> : never
      : C extends "1" ? `${Acc}1` : Acc;
// schoolbook over B's digits (A, B reversed): the running sum Acc drops its
// lowest digit, final, into Out at every digit of B
type MulLoop<A extends string, B extends string, Acc extends string, Out extends string> =
  B extends `${infer b extends Dg}${infer BR}`
    ? (b extends "0" ? Acc : AddRR<Acc, MulDigitRR<A, b, "0", "">, "0", "">) extends `${infer low}${infer rest}`
      ? MulLoop<A, BR, rest, `${Out}${low}`>
      : MulLoop<A, BR, "", `${Out}0`>
    : `${Out}${Acc}`;

export type UMul<A extends string, B extends string> =
  A extends "0" ? "0" : B extends "0" ? "0" : StripZeros<Rev<MulLoop<Rev<A>, Rev<B>, "", "">>>;

// long division: [quotient, remainder], B > 0
type QDigit<R extends string, B extends string, Q extends Dg[] = ["9", "8", "7", "6", "5", "4", "3", "2", "1"]> =
  Q extends [infer q extends Dg, ...infer QR extends Dg[]]
    ? UCmp<UMulDigit<B, q>, R> extends "gt" ? QDigit<R, B, QR> : [q, USub<R, UMulDigit<B, q>>]
    : ["0", R];

type DivLoop<A extends string, B extends string, Q extends string, R extends string> =
  A extends `${infer a}${infer AR}`
    ? QDigit<StripZeros<`${R}${a}`>, B> extends [infer q extends string, infer r extends string]
      ? DivLoop<AR, B, `${Q}${q}`, r>
      : never
    : [StripZeros<Q>, R];

export type UDivMod<A extends string, B extends string> = DivLoop<A, B, "", "0">;

// [A / 2, A % 2]
type HalfLoop<A extends string, C extends string, Q extends string> =
  A extends `${infer a extends Dg}${infer AR}`
    ? HalfT[C & ("0" | "1")][a] extends `${infer q}${infer r}` ? HalfLoop<AR, r, `${Q}${q}`> : never
    : [StripZeros<Q>, C];

export type UHalf<A extends string> = HalfLoop<A, "0", "">;

// ---------------------------------------------------------------------------
// signed values

type Two63 = "9223372036854775808";
type Two64 = "18446744073709551616";

export type Str<N extends bigint> = `${N}`;
export type Big<S extends string> = S extends `${infer N extends bigint}` ? N : never;

type Neg<S extends string> = S extends "0" ? "0" : S extends `-${infer M}` ? M : `-${S}`;
type Abs<S extends string> = S extends `-${infer M}` ? M : S;
type IsNeg<S extends string> = S extends `-${string}` ? true : false;

// at least 19 digits: the only magnitudes that may leave the int64 range
type Long<S extends string> =
  S extends `${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${infer _}${infer R}`
    ? R extends "" ? false : true
    : false;

// a signed decimal string reduced to the int64 range (mod 2^64)
type Wrap<S extends string> =
  Long<Abs<S>> extends false ? S
  : IsNeg<S> extends true
    ? UCmp<Abs<S>, Two63> extends "gt" ? HexStr<NegHex<Hex16<Abs<S>>>> : S
    : UCmp<S, Two63> extends "lt" ? S : HexStr<Hex16<S>>;

// unsigned magnitude in [0, 2^64) -> signed decimal string
type FromUnsigned<U extends string> = UCmp<U, Two63> extends "lt" ? U : Neg<USub<Two64, U>>;
// signed decimal string -> unsigned magnitude in [0, 2^64)
type ToUnsigned<S extends string> = IsNeg<S> extends true ? USub<Two64, Abs<S>> : S;

type SAdd<A extends string, B extends string> =
  IsNeg<A> extends IsNeg<B>
    ? IsNeg<A> extends true ? Neg<UAdd<Abs<A>, Abs<B>>> : UAdd<A, B>
    : UCmp<Abs<A>, Abs<B>> extends "lt"
      ? IsNeg<B> extends true ? Neg<USub<Abs<B>, Abs<A>>> : USub<B, Abs<A>>
      : IsNeg<A> extends true ? Neg<USub<Abs<A>, Abs<B>>> : USub<A, Abs<B>>;

/** @native iadd */
export type iadd<A, B> = iadd_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type iadd_c<A extends bigint, B extends bigint> = Big<Wrap<SAdd<Str<A>, Str<B>>>>;
/** @native isub */
export type isub<A, B> = isub_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type isub_c<A extends bigint, B extends bigint> = Big<Wrap<SAdd<Str<A>, Neg<Str<B>>>>>;
/** @native ineg */
export type ineg<A> = ineg_c<A extends bigint ? A : never>;
type ineg_c<A extends bigint> = Big<Wrap<Neg<Str<A>>>>;

/** @native imul */
export type imul<A, B> = imul_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type imul_c<A extends bigint, B extends bigint> =
  UMul<Abs<Str<A>>, Abs<Str<B>>> extends infer P extends string
    ? Big<Wrap<IsNeg<Str<A>> extends IsNeg<Str<B>> ? P : Neg<P>>>
    : never;

// truncated division; the quotient of -2^63 / -1 wraps to -2^63
/** @native idiv */
export type idiv<A, B> = idiv_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type idiv_c<A extends bigint, B extends bigint> =
  B extends 0n ? rterr<"integer divide by zero">
  : UDivMod<Abs<Str<A>>, Abs<Str<B>>>[0] extends infer Q extends string
    ? Big<Wrap<IsNeg<Str<A>> extends IsNeg<Str<B>> ? Q : Neg<Q>>>
    : never;

/** @native irem */
export type irem<A, B> = irem_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type irem_c<A extends bigint, B extends bigint> =
  B extends 0n ? rterr<"integer divide by zero">
  : UDivMod<Abs<Str<A>>, Abs<Str<B>>>[1] extends infer R extends string
    ? Big<IsNeg<Str<A>> extends true ? Neg<R> : R>
    : never;

/** @native udiv */
export type udiv<A, B> = udiv_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type udiv_c<A extends bigint, B extends bigint> =
  B extends 0n ? rterr<"integer divide by zero">
  : Big<FromUnsigned<UDivMod<ToUnsigned<Str<A>>, ToUnsigned<Str<B>>>[0]>>;

/** @native urem */
export type urem<A, B> = urem_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type urem_c<A extends bigint, B extends bigint> =
  B extends 0n ? rterr<"integer divide by zero">
  : Big<FromUnsigned<UDivMod<ToUnsigned<Str<A>>, ToUnsigned<Str<B>>>[1]>>;

type SCmp<A extends string, B extends string> =
  IsNeg<A> extends true
    ? IsNeg<B> extends true ? UCmp<Abs<B>, Abs<A>> : "lt"
    : IsNeg<B> extends true ? "gt" : UCmp<A, B>;

type UCmpS<A extends string, B extends string> = UCmp<ToUnsigned<A>, ToUnsigned<B>>;

/** @native ieq */
export type ieq<A, B> = ieq_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type ieq_c<A extends bigint, B extends bigint> = [A] extends [B] ? true : false;
/** @native ine */
export type ine<A, B> = ine_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type ine_c<A extends bigint, B extends bigint> = [A] extends [B] ? false : true;
/** @native ilt */
export type ilt<A, B> = ilt_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type ilt_c<A extends bigint, B extends bigint> = SCmp<Str<A>, Str<B>> extends "lt" ? true : false;
/** @native ile */
export type ile<A, B> = ile_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type ile_c<A extends bigint, B extends bigint> = SCmp<Str<A>, Str<B>> extends "gt" ? false : true;
/** @native igt */
export type igt<A, B> = igt_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type igt_c<A extends bigint, B extends bigint> = SCmp<Str<A>, Str<B>> extends "gt" ? true : false;
/** @native ige */
export type ige<A, B> = ige_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type ige_c<A extends bigint, B extends bigint> = SCmp<Str<A>, Str<B>> extends "lt" ? false : true;
/** @native iult */
export type iult<A, B> = iult_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type iult_c<A extends bigint, B extends bigint> = UCmpS<Str<A>, Str<B>> extends "lt" ? true : false;
/** @native iule */
export type iule<A, B> = iule_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type iule_c<A extends bigint, B extends bigint> = UCmpS<Str<A>, Str<B>> extends "gt" ? false : true;
/** @native iugt */
export type iugt<A, B> = iugt_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type iugt_c<A extends bigint, B extends bigint> = UCmpS<Str<A>, Str<B>> extends "gt" ? true : false;
/** @native iuge */
export type iuge<A, B> = iuge_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type iuge_c<A extends bigint, B extends bigint> = UCmpS<Str<A>, Str<B>> extends "lt" ? false : true;

// ---------------------------------------------------------------------------
// bits: 16 hex digits or 64-character binary strings, most significant first

// [U / 256, U % 256] of a magnitude, digit by digit (C: the remainder so far)
type Div256<U extends string, C extends string, Q extends string> =
  U extends `${infer d extends Dg}${infer UR}`
    ? Div256T[C & keyof Div256T][d] extends `${infer q}${infer c2}` ? Div256<UR, c2, `${Q}${q}`> : never
    : [StripZeros<Q>, C];
// the low 2N hex digits of magnitude U (a byte per division)
type HexLow<U extends string, N extends unknown[], Acc extends string> =
  N extends [unknown, ...infer NR]
    ? U extends "0" ? `${Fill<"00", N>}${Acc}`
    : Div256<U, "0", ""> extends [infer q extends string, infer r extends string] ? HexLow<q, NR, `${HexOfB[r & keyof HexOfB]}${Acc}`> : never
    : Acc;
type Hex16<U extends string> = HexLow<U, Count["8"], "">;
// the low 128 bits of magnitude U as 32 hex digits
export type Hex128<U extends string> = HexLow<U, Count["16"], "">;
// the two's complement of 16 hex digits (mod 2^64)
type NegHex<H extends string> = NegHexLoop<Rev<H>, "1", "">;
type NegHexLoop<Hr extends string, C extends string, Acc extends string> =
  Hr extends `${infer h}${infer HR}`
    ? NegHexT[C & keyof NegHexT][h & keyof NegHexT["0"]] extends `${infer c2}${infer d}` ? NegHexLoop<HR, c2, `${d}${Acc}`> : never
    : Acc;
// the 64 bits of A as 16 hex digits (a negative A in two's complement)
export type Hex<A extends bigint> = Str<A> extends `-${infer M}` ? NegHex<Hex16<M>> : Hex16<Str<A>>;

// the magnitude of hex digits H; Acc is the value so far, lowest digit first
type FromHexLoop<H extends string, Acc extends string> =
  H extends `${infer h1}${infer h2}${infer HR}` ? FromHexLoop<HR, Mul256Add<Acc, ByteOfHex[`${h1}${h2}` & keyof ByteOfHex], "">>
  : H extends `${infer h}${infer HR}` ? FromHexLoop<HR, Mul16Add<Acc, HexVal[h & keyof HexVal], "">>
  : Acc extends "" ? "0" : Rev<Acc>;
// 256 * A + C, A and the result lowest digit first
type Mul256Add<A extends string, C extends string, Out extends string> =
  A extends `${infer d extends Dg}${infer AR}`
    ? M256T[C & keyof M256T][d] extends `${infer o}${infer nc}` ? Mul256Add<AR, nc, `${Out}${o}`> : never
    : C extends "0" ? Out : `${Out}${Rev<C>}`;
// 16 * A + C, A and the result lowest digit first
type Mul16Add<A extends string, C extends string, Out extends string> =
  A extends `${infer d extends Dg}${infer AR}`
    ? M16T[C & keyof M16T][d] extends `${infer o}${infer nc}` ? Mul16Add<AR, nc, `${Out}${o}`> : never
    : C extends "0" ? Out : `${Out}${Rev<C>}`;
// the signed decimal of 16 hex digits (two's complement)
type HexStr<H extends string> =
  H extends `${"8" | "9" | "a" | "b" | "c" | "d" | "e" | "f"}${string}` ? `-${FromHexLoop<NegHex<H>, "">}` : FromHexLoop<H, "">;
export type FromHex<H extends string> = Big<HexStr<H>>;

type HexToBits<H extends string, Acc extends string = ""> =
  H extends `${infer h}${infer HR}` ? HexToBits<HR, `${Acc}${HexBits[h & keyof HexBits]}`> : Acc;
type BitsToHex<B extends string, Acc extends string = ""> =
  B extends `${infer a}${infer b}${infer c}${infer d}${infer BR}` ? BitsToHex<BR, `${Acc}${BitsHex[`${a}${b}${c}${d}` & keyof BitsHex]}`> : Acc;

export type Bits<A extends bigint> = HexToBits<Hex<A>>;
export type FromBits<B extends string> = FromHex<BitsToHex<B>>;

type HexOp<A extends string, B extends string, T extends Record<string, Record<string, string>>, Acc extends string = ""> =
  A extends `${infer a}${infer AR}`
    ? B extends `${infer b}${infer BR}` ? HexOp<AR, BR, T, `${Acc}${T[a][b]}`> : never
    : Acc;

/** @native iand */
export type iand<A, B> = iand_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type iand_c<A extends bigint, B extends bigint> = FromHex<HexOp<Hex<A>, Hex<B>, AndH>>;
/** @native ior */
export type ior<A, B> = ior_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type ior_c<A extends bigint, B extends bigint> = FromHex<HexOp<Hex<A>, Hex<B>, OrH>>;
/** @native ixor */
export type ixor<A, B> = ixor_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type ixor_c<A extends bigint, B extends bigint> = FromHex<HexOp<Hex<A>, Hex<B>, XorH>>;
/** @native iandnot */
export type iandnot<A, B> = iandnot_c<A extends bigint ? A : never, B extends bigint ? B : never>;
type iandnot_c<A extends bigint, B extends bigint> = FromHex<HexOp<Hex<A>, Hex<B>, AndNotH>>;
/** @native inot */
export type inot<A> = inot_c<A extends bigint ? A : never>;
type inot_c<A extends bigint> = isub<-1n, A>;

type Drop<S extends string, N extends unknown[]> =
  N extends [unknown, ...infer NR] ? S extends `${string}${infer R}` ? Drop<R, NR> : S : S;
type Fill<C extends string, N extends unknown[], Acc extends string = ""> =
  N extends [unknown, ...infer NR] ? Fill<C, NR, `${Acc}${C}`> : Acc;
type Take<S extends string, N extends unknown[], Acc extends string = ""> =
  N extends [unknown, ...infer NR] ? S extends `${infer C}${infer R}` ? Take<R, NR, `${Acc}${C}`> : Acc : Acc;
type Rest<N extends unknown[]> = Count["64"] extends [...N, ...infer R] ? R : [];

// shift amounts outside [0, 64)
type Big64<S extends bigint> = ilt<S, 0n> extends true ? true : ige<S, 64n> extends true ? true : false;

/** @native ishl */
export type ishl<A, S> = ishl_c<A extends bigint ? A : never, S extends bigint ? S : never>;
type ishl_c<A extends bigint, S extends bigint> =
  Big64<S> extends true ? 0n : FromBits<`${Drop<Bits<A>, Count[Str<S> & keyof Count]>}${Fill<"0", Count[Str<S> & keyof Count]>}`>;

/** @native ishr */
export type ishr<A, S> = ishr_c<A extends bigint ? A : never, S extends bigint ? S : never>;
type ishr_c<A extends bigint, S extends bigint> =
  Big64<S> extends true ? (ilt<A, 0n> extends true ? -1n : 0n)
  : FromBits<`${Fill<ilt<A, 0n> extends true ? "1" : "0", Count[Str<S> & keyof Count]>}${Take<Bits<A>, Rest<Count[Str<S> & keyof Count]>>}`>;

/** @native iushr */
export type iushr<A, S> = iushr_c<A extends bigint ? A : never, S extends bigint ? S : never>;
type iushr_c<A extends bigint, S extends bigint> =
  Big64<S> extends true ? 0n
  : FromBits<`${Fill<"0", Count[Str<S> & keyof Count]>}${Take<Bits<A>, Rest<Count[Str<S> & keyof Count]>>}`>;

// wraps to a width: k > 0 signed k bits, k < 0 unsigned |k| bits
/** @native iwrap */
export type iwrap<A, K> = iwrap_c<A extends bigint ? A : never, K extends bigint ? K : never>;
type iwrap_c<A extends bigint, K extends bigint> =
  K extends 64n | -64n ? A
  : K extends -32n | -16n | -8n
    ? FromBits<`${Fill<"0", Rest<Count[Str<ineg<K>> & keyof Count]>>}${Drop<Bits<A>, Rest<Count[Str<ineg<K>> & keyof Count]>>}`>
    : Drop<Bits<A>, Rest<Count[Str<K> & keyof Count]>> extends `${infer s}${infer R}`
      ? FromBits<`${Fill<s, Rest<Count[Str<K> & keyof Count]>>}${s}${R}`>
      : never;

/** @native itoa */
export type itoa<A> = itoa_c<A extends bigint ? A : never>;
type itoa_c<A extends bigint> = Str<A>;
/** @native uitoa */
export type uitoa<A> = uitoa_c<A extends bigint ? A : never>;
type uitoa_c<A extends bigint> = ToUnsigned<Str<A>>;

// a panic ends the computation: everything that depends on it is never
export type Panic<Msg> = never;
